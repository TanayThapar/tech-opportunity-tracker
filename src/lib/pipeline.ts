import { TechOpportunity, PipelineRunLog, DiscoveryConfidence, OpportunityStatus } from '@/types';
import {
  getOpportunities,
  saveOpportunities,
  appendPipelineLog,
  updateOpportunity,
} from '@/lib/store';
import { evaluateDuplicate, MatchCandidate } from '@/lib/fuzzy';
import { fetchLiveWebFeedsWithErrors, RawDiscoveredItem } from '@/lib/sources';
import { checkUrlLiveness } from '@/lib/safeFetch';
import { AIProvider } from '@/lib/ai/provider';
import { processUserUpdatesAndNotifications } from '@/lib/notifications';

export interface PipelineExecutionResult {
  log: PipelineRunLog;
  newOpportunities: TechOpportunity[];
  updatedOpportunities: TechOpportunity[];
}

/**
 * Validates a URL syntactically.
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
function isValidDate(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const timestamp = Date.parse(dateStr);
  return !isNaN(timestamp);
}

/**
 * Evaluates whether an opportunity qualifies for 'high' or 'low' discovery confidence.
 * Automatic high confidence requires ALL of:
 * 1. Recognized type
 * 2. Reachable source URL (liveness probe passed)
 * 3. No near-duplicate
 * 4. Originates from structured source adapter (AI or human submitted never auto-publishes)
 * 5. Parseable start and end dates (jobs may have no application deadline).
 */
export async function determineConfidenceWithLiveness(
  item: RawDiscoveredItem,
  isNearDuplicate: boolean,
  nearDuplicateReason?: string
): Promise<{ confidence: DiscoveryConfidence; reasons: string[]; isLivenessOk: boolean }> {
  const reasons: string[] = [...(item.confidence_reasons || [])];
  let isLow = false;

  // 1. Origin check: AI-extracted or hand-written NEVER auto-publishes
  if (item.origin && item.origin !== 'adapter') {
    isLow = true;
    reasons.push(
      item.origin === 'ai_extracted'
        ? 'AI-extracted, not human verified'
        : `Requires moderator approval (origin: ${item.origin})`
    );
  }

  // 2. Type validation
  const validTypes = ['hackathon', 'conference', 'workshop', 'internship', 'job'];
  if (!validTypes.includes(item.type)) {
    isLow = true;
    reasons.push(`Unrecognized or ambiguous type: "${item.type}"`);
  }

  // 3. Date validation
  if (item.type === 'job') {
    // Jobs can have no application deadline ("no deadline listed")
    if (!item.application_deadline) {
      if (!reasons.some(r => r.includes('no application deadline listed'))) {
        reasons.push('no application deadline listed (rolling evaluation)');
      }
    }
  } else {
    // Conferences, hackathons, workshops, internships require parseable start and end dates
    if (!isValidDate(item.start_date) || !isValidDate(item.end_date)) {
      isLow = true;
      reasons.push('Start or end date is missing, tentative, or unparseable');
    }
  }

  // 4. Source URL syntax validation
  if (!isValidUrl(item.source_url)) {
    isLow = true;
    reasons.push('Missing or invalid source URL');
    return { confidence: 'low', reasons, isLivenessOk: false };
  }

  // 5. SSRF-safe URL Liveness Check
  let isLivenessOk = false;
  try {
    const probe = await checkUrlLiveness(item.source_url);
    if (probe.ok) {
      isLivenessOk = true;
      reasons.push('source URL reachable at fetch time');
    } else if (item.origin === 'adapter' && (probe.statusCode === 403 || probe.statusCode === 401)) {
      isLivenessOk = true;
      reasons.push(`source URL verified live at fetch time (HTTP ${probe.statusCode} anti-bot challenge)`);
    } else {
      isLow = true;
      reasons.push('source URL unreachable at fetch time');
    }
  } catch {
    isLow = true;
    reasons.push('source URL unreachable at fetch time');
  }

  // 6. Near-duplicate check
  if (isNearDuplicate) {
    isLow = true;
    if (nearDuplicateReason) {
      reasons.push(nearDuplicateReason);
    }
  }

  // 7. Scraper / Adapter forced flag
  if (item.force_low_confidence) {
    isLow = true;
  }

  return {
    confidence: isLow ? 'low' : 'high',
    reasons,
    isLivenessOk,
  };
}

/**
 * Executes the Discovery Pipeline:
 * 1. Fetches candidate opportunities from structured source adapters.
 * 2. Archives expired events (jobs only on explicit closure evidence).
 * 3. Runs fuzzy deduplication and updates existing items with better data.
 * 4. Checks source URL liveness and computes confidence.
 * 5. Applies publication rule: ONLY high-confidence adapter items get status='published'.
 *    All others get status='needs_review'.
 * 6. Generates update lists and notifications.
 * 7. Records execution log.
 */
export async function runDiscoveryPipeline(options: {
  customCandidates?: RawDiscoveredItem[];
  triggeredByAdmin?: boolean;
} = {}): Promise<PipelineExecutionResult> {
  const runId = `run-${Date.now()}`;
  const now = new Date();
  const errors: string[] = [];
  const addedTitles: string[] = [];
  const skippedTitles: string[] = [];
  const updatedTitles: string[] = [];

  let currentEvents = await getOpportunities();
  let eventsArchivedCount = 0;

  // 1. Expiration & Archival Check
  // Jobs follow explicit closure rules (Problem 5): do NOT archive on transient end_date placeholder
  currentEvents = currentEvents.map(evt => {
    try {
      if (evt.status !== 'published') return evt;

      if (evt.type === 'job') {
        // Jobs: archive only if explicit deadline passed or marked closed/expired
        if (evt.application_deadline) {
          const deadlineTime = new Date(evt.application_deadline).getTime();
          if (deadlineTime < now.getTime()) {
            eventsArchivedCount++;
            return {
              ...evt,
              status: 'archived' as const,
              listing_status: 'expired' as const,
              updated_at: now.toISOString(),
            };
          }
        }
        if (evt.listing_status === 'closed' || evt.listing_status === 'expired') {
          eventsArchivedCount++;
          return {
            ...evt,
            status: 'archived' as const,
            updated_at: now.toISOString(),
          };
        }
      } else {
        // Events / Conferences / Hackathons: archive when end_date has passed
        const evtEndDate = new Date(evt.end_date);
        if (evtEndDate.getTime() < now.getTime()) {
          eventsArchivedCount++;
          return {
            ...evt,
            status: 'archived' as const,
            updated_at: now.toISOString(),
          };
        }
      }
    } catch {
      // ignore date parse errors during archiving check
    }
    return evt;
  });

  // 2. Fetch candidates from structured adapters
  let candidates: RawDiscoveredItem[] = [];

  if (options.customCandidates !== undefined) {
    // Custom candidates submitted via admin/moderator manual run or test runner
    candidates = options.customCandidates.map(c => ({
      ...c,
      origin: c.origin || (options.triggeredByAdmin ? 'admin_entered' : 'user_submitted'),
      force_low_confidence: c.force_low_confidence !== undefined ? c.force_low_confidence : true,
    }));
  } else {
    // Normal pipeline run: fetch from structured adapters
    const fetchRes = await fetchLiveWebFeedsWithErrors();
    candidates = fetchRes.items;
    errors.push(...fetchRes.errors);

    // Optional AI extraction step if enabled (Problem 6)
    const aiProvider = new AIProvider();
    if (aiProvider.isEnabled) {
      try {
        // AI extraction placeholder for configured unstructured feeds
        // All AI extracted items are guaranteed origin: 'ai_extracted' and force_low_confidence: true
      } catch (aiErr: any) {
        errors.push(`AI extraction step failed: ${aiErr.message}`);
      }
    }
  }

  let duplicatesSkippedCount = 0;
  let lowConfidenceCount = 0;
  const newlyAddedOpportunities: TechOpportunity[] = [];
  const modifiedOpportunities: TechOpportunity[] = [];

  // Match index of existing opportunities
  const matchIndex: MatchCandidate[] = currentEvents.map(e => ({
    id: e.id,
    title: e.title,
    organizer: e.organizer,
    start_date: e.start_date,
    end_date: e.end_date,
    submission_deadline: e.submission_deadline,
    conference_tier: e.conference_tier,
    source_url: e.source_url,
    discovery_confidence: e.discovery_confidence,
    confidence_reasons: e.confidence_reasons,
  }));

  // 3. Process each candidate
  for (const candidate of candidates) {
    try {
      // Skip past event candidates at ingest time (Problem 2)
      if (candidate.type !== 'job' && candidate.end_date) {
        const endDt = new Date(candidate.end_date);
        if (endDt.getTime() < now.getTime()) {
          duplicatesSkippedCount++;
          skippedTitles.push(`${candidate.title} (Already expired at ingest time)`);
          continue;
        }
      }

      // Deduplication check
      const dupResult = evaluateDuplicate(
        {
          title: candidate.title,
          organizer: candidate.organizer,
          start_date: candidate.start_date,
          end_date: candidate.end_date,
          submission_deadline: candidate.submission_deadline,
          conference_tier: candidate.conference_tier,
          source_url: candidate.source_url,
          force_low_confidence: candidate.force_low_confidence,
        },
        matchIndex
      );

      // If duplicate or near-duplicate with better data -> UPDATE existing record instead of skipping
      if (dupResult.shouldUpdateExisting && dupResult.matchedId) {
        const existingIdx = currentEvents.findIndex(e => e.id === dupResult.matchedId);
        if (existingIdx !== -1) {
          const existing = currentEvents[existingIdx];
          const updatedRecord: TechOpportunity = {
            ...existing,
            submission_deadline: candidate.submission_deadline || existing.submission_deadline,
            start_date: candidate.start_date || existing.start_date,
            end_date: candidate.end_date || existing.end_date,
            conference_tier: candidate.conference_tier || existing.conference_tier,
            confidence_reasons: [
              ...(existing.confidence_reasons || []),
              ...dupResult.betterDataReasons,
            ],
            updated_at: now.toISOString(),
          };

          currentEvents[existingIdx] = updatedRecord;
          modifiedOpportunities.push(updatedRecord);
          updatedTitles.push(`${existing.title} (Enhanced with: ${dupResult.betterDataReasons.join(', ')})`);
          continue;
        }
      }

      // If duplicate without better data -> skip
      if (dupResult.isDuplicate) {
        duplicatesSkippedCount++;
        skippedTitles.push(`${candidate.title} (Matches: ${dupResult.matchedTitle})`);
        continue;
      }

      // Liveness probe and confidence calculation
      const evalResult = await determineConfidenceWithLiveness(
        candidate,
        dupResult.isAmbiguousNearDuplicate,
        dupResult.reasons[0]
      );

      if (evalResult.confidence === 'low') {
        lowConfidenceCount++;
      }

      // Publication rule change (Problem 2):
      // ONLY items evaluated as 'high' confidence get status: 'published'.
      // Anything below high confidence gets status: 'needs_review' and is held back from public view.
      const status: OpportunityStatus =
        evalResult.confidence === 'high' ? 'published' : 'needs_review';

      const newOpp: TechOpportunity = {
        id: `opp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: candidate.title,
        type: candidate.type,
        conference_tier: candidate.conference_tier || null,
        subfield: candidate.subfield || null,
        organizer: candidate.organizer,
        start_date: candidate.start_date,
        end_date: candidate.end_date,
        submission_deadline: candidate.submission_deadline || null,
        format: candidate.format,
        location: candidate.location || null,
        source_url: candidate.source_url,
        description: candidate.description,
        discovery_confidence: evalResult.confidence,
        confidence_reasons: evalResult.reasons,
        status,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        origin: candidate.origin || 'adapter',
        company: candidate.company || (candidate.type === 'job' ? candidate.organizer : undefined),
        posted_date: candidate.posted_date || null,
        application_deadline: candidate.application_deadline || candidate.submission_deadline || null,
        link_status: evalResult.isLivenessOk ? 'ok' : 'unreachable',
        last_checked_at: now.toISOString(),
        listing_status: candidate.listing_status || 'open',
        work_mode: candidate.work_mode || candidate.format,
      };

      newlyAddedOpportunities.push(newOpp);
      addedTitles.push(newOpp.title);

      // Add to running match index
      matchIndex.push({
        id: newOpp.id,
        title: newOpp.title,
        organizer: newOpp.organizer,
        start_date: newOpp.start_date,
        end_date: newOpp.end_date,
        submission_deadline: newOpp.submission_deadline,
        conference_tier: newOpp.conference_tier,
        source_url: newOpp.source_url,
        discovery_confidence: newOpp.discovery_confidence,
      });
    } catch (err: any) {
      errors.push(`Error processing candidate "${candidate.title}": ${err.message || String(err)}`);
    }
  }

  // 4. Persist updated and new opportunities to durable store
  const allUpdated = [...currentEvents, ...newlyAddedOpportunities];
  await saveOpportunities(allUpdated);

  // 5. Trigger In-App Updates and Email Notifications (Problem 7)
  try {
    await processUserUpdatesAndNotifications(
      allUpdated,
      newlyAddedOpportunities,
      modifiedOpportunities,
      [] // In background cron, queries all active users with preferences
    );
  } catch (notifErr: any) {
    errors.push(`Notification processing error: ${notifErr.message}`);
  }

  // 6. Append Pipeline Execution Log
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
      updated_titles: updatedTitles,
    },
  };

  await appendPipelineLog(log);

  return {
    log,
    newOpportunities: newlyAddedOpportunities,
    updatedOpportunities: modifiedOpportunities,
  };
}
