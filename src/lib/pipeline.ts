import { TechOpportunity, PipelineRunLog, DiscoveryConfidence } from '@/types';
import { getOpportunities, saveOpportunities, appendPipelineLog } from '@/lib/store';
import { evaluateDuplicate, MatchCandidate } from '@/lib/fuzzy';
import { fetchLiveWebFeeds, RawDiscoveredItem } from '@/lib/sources';

export interface PipelineExecutionResult {
  log: PipelineRunLog;
  newOpportunities: TechOpportunity[];
}

/**
 * Validates a URL to ensure it is syntactically valid and not empty.
 */
function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Checks if a date string is a valid ISO date.
 */
function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const timestamp = Date.parse(dateStr);
  return !isNaN(timestamp);
}

/**
 * Evaluates whether an opportunity should have 'high' or 'low' discovery_confidence.
 * Criteria for 'low':
 * 1. Date is ambiguous/missing
 * 2. Event type is unclear
 * 3. No working or valid source URL
 * 4. It looks like a near-duplicate of an existing entry (ambiguous match)
 * 5. Forced flag from scraper
 */
export function determineConfidence(
  item: RawDiscoveredItem,
  isNearDuplicate: boolean,
  nearDuplicateReason?: string
): { confidence: DiscoveryConfidence; reasons: string[] } {
  const reasons: string[] = [...(item.confidence_reasons || [])];
  let isLow = false;

  // 1. Date validity
  if (!isValidDate(item.start_date) || !isValidDate(item.end_date)) {
    isLow = true;
    reasons.push('Start or end date is missing, tentative, or unparseable');
  }

  // 2. Event type validity
  const validTypes = ['hackathon', 'conference', 'workshop', 'internship'];
  if (!validTypes.includes(item.type)) {
    isLow = true;
    reasons.push(`Unrecognized or ambiguous event type: "${item.type}"`);
  }

  // 3. Source URL validation
  if (!isValidUrl(item.source_url)) {
    isLow = true;
    reasons.push('Missing or invalid source URL');
  }

  // 4. Near-duplicate check
  if (isNearDuplicate) {
    isLow = true;
    if (nearDuplicateReason) {
      reasons.push(nearDuplicateReason);
    }
  }

  // 5. Force flag
  if (item.force_low_confidence) {
    isLow = true;
  }

  return {
    confidence: isLow ? 'low' : 'high',
    reasons,
  };
}

/**
 * Executes the Discovery Pipeline:
 * 1. Fetches candidate opportunities from web feeds/sources
 * 2. Archives expired events
 * 3. Runs fuzzy deduplication against existing database
 * 4. Evaluates confidence levels
 * 5. Auto-publishes all new events immediately (status: 'published')
 * 6. Logs full execution report with counts & titles
 */
export async function runDiscoveryPipeline(customCandidates?: RawDiscoveredItem[]): Promise<PipelineExecutionResult> {
  const runId = `run-${Date.now()}`;
  const now = new Date();
  const errors: string[] = [];
  const addedTitles: string[] = [];
  const skippedTitles: string[] = [];

  let currentEvents = getOpportunities();
  let eventsArchivedCount = 0;

  // 1. Automatically expire/archive events whose end_date has passed
  currentEvents = currentEvents.map(evt => {
    try {
      const evtEndDate = new Date(evt.end_date);
      // If end date is before current time and still marked published
      if (evtEndDate.getTime() < now.getTime() && evt.status === 'published') {
        eventsArchivedCount++;
        return {
          ...evt,
          status: 'archived' as const,
          updated_at: now.toISOString(),
        };
      }
    } catch {
      // ignore date parse errors for archiving check
    }
    return evt;
  });

  // 2. Ingest candidates
  let candidates: RawDiscoveredItem[] = [];
  try {
    if (customCandidates && customCandidates.length > 0) {
      candidates = customCandidates;
    } else {
      candidates = await fetchLiveWebFeeds();
    }
  } catch (err: any) {
    errors.push(`Failed to fetch live web sources: ${err.message || String(err)}`);
  }

  let duplicatesSkippedCount = 0;
  let lowConfidenceCount = 0;
  const newlyAddedOpportunities: TechOpportunity[] = [];

  // Build match index of existing items
  const matchIndex: MatchCandidate[] = currentEvents.map(e => ({
    title: e.title,
    organizer: e.organizer,
    start_date: e.start_date,
    source_url: e.source_url,
  }));

  // 3. Process each candidate
  for (const candidate of candidates) {
    try {
      // Fuzzy deduplication
      const dupResult = evaluateDuplicate(
        {
          title: candidate.title,
          organizer: candidate.organizer,
          start_date: candidate.start_date,
          source_url: candidate.source_url,
        },
        matchIndex
      );

      if (dupResult.isDuplicate) {
        duplicatesSkippedCount++;
        skippedTitles.push(`${candidate.title} (Matches: ${dupResult.matchedTitle})`);
        continue;
      }

      // Determine confidence
      const confidenceEval = determineConfidence(
        candidate,
        dupResult.isAmbiguousNearDuplicate,
        dupResult.reasons[0]
      );

      if (confidenceEval.confidence === 'low') {
        lowConfidenceCount++;
      }

      // Spec rule: ALL events auto-publish immediately (status=published) regardless of confidence.
      // Low confidence events show up in the "Needs review" section for spot-checking,
      // but are not held back from the main calendar.
      const newOpp: TechOpportunity = {
        id: `opp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: candidate.title,
        type: candidate.type,
        conference_tier: candidate.conference_tier || null,
        organizer: candidate.organizer,
        start_date: candidate.start_date,
        end_date: candidate.end_date,
        format: candidate.format,
        location: candidate.location || null,
        source_url: candidate.source_url,
        description: candidate.description,
        discovery_confidence: confidenceEval.confidence,
        confidence_reasons: confidenceEval.reasons,
        status: 'published',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      newlyAddedOpportunities.push(newOpp);
      addedTitles.push(newOpp.title);

      // Add to running match index so subsequent candidates in the same batch deduplicate
      matchIndex.push({
        title: newOpp.title,
        organizer: newOpp.organizer,
        start_date: newOpp.start_date,
        source_url: newOpp.source_url,
      });
    } catch (err: any) {
      errors.push(`Error processing candidate "${candidate.title}": ${err.message || String(err)}`);
    }
  }

  // 4. Save updated opportunities
  const allUpdated = [...currentEvents, ...newlyAddedOpportunities];
  saveOpportunities(allUpdated);

  // 5. Create pipeline log
  const log: PipelineRunLog = {
    id: runId,
    timestamp: now.toISOString(),
    status: errors.length > 0 && newlyAddedOpportunities.length === 0 ? 'failed' : 'success',
    events_scanned: candidates.length,
    events_added: newlyAddedOpportunities.length,
    duplicates_skipped: duplicatesSkippedCount,
    events_archived: eventsArchivedCount,
    low_confidence_count: lowConfidenceCount,
    errors,
    details: {
      added_titles: addedTitles,
      skipped_titles: skippedTitles,
    },
  };

  appendPipelineLog(log);

  return {
    log,
    newOpportunities: newlyAddedOpportunities,
  };
}
