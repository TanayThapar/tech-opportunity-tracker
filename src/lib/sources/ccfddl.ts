/**
 * Source Adapter: CCF Deadlines (Computer Science Conferences & CORE rankings)
 *
 * Dataset: https://github.com/ccfddl/ccf-deadlines
 * License: MIT License
 * Attribution:
 *   Copyright (c) 2021 CCFDDL
 *   Data sourced from CCF-Deadlines open community repository (https://github.com/ccfddl/ccf-deadlines).
 *   Dates and deadlines are community-maintained, not re-confirmed against organizer sites.
 */

import { RawDiscoveredItem } from '@/lib/sources';
import { parseConferenceDateRange } from '@/lib/dateUtils';
import { normalizeTimezoneToUTC } from '@/lib/timezone';
import yaml from 'yaml';

// In-run cache to prevent duplicate fetches across invocations within the same runtime
let inRunCache: RawDiscoveredItem[] | null = null;
let inRunCacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface CCFRank {
  ccf?: string;
  core?: string;
  thcpl?: string;
}

export interface CCFTimeline {
  deadline?: string;
  abstract_deadline?: string;
  comment?: string;
}

export interface CCFConferenceEdition {
  year: number;
  id: string;
  link: string;
  timeline?: CCFTimeline[];
  timezone?: string;
  date?: string;
  place?: string;
}

export interface CCFConferenceItem {
  title: string;
  description?: string;
  sub?: string;
  rank?: CCFRank;
  confs?: CCFConferenceEdition[];
}

export function mapCCFSubToCategory(sub?: string): string {
  if (!sub) return 'General CS';
  const s = sub.trim().toUpperCase();
  if (s === 'AI' || s === 'ML') return 'AI / Machine Learning';
  if (s === 'SYS' || s === 'TC' || s === 'ARCH') return 'Systems & Architecture';
  if (s === 'SEC' || s === 'SC' || s === 'CRYPTO') return 'Security & Privacy';
  if (s === 'SE' || s === 'PL') return 'Software Engineering & PL';
  if (s === 'DB' || s === 'DM' || s === 'IR') return 'Databases & Data Mining';
  if (s === 'NW' || s === 'NET') return 'Computer Networks & Mobile';
  if (s === 'TH' || s === 'THEORY') return 'Theory & Algorithms';
  if (s === 'HCI' || s === 'CG') return 'HCI & Computer Graphics';
  return 'General CS';
}

/**
 * Normalizes CORE ranking to standard conference_tier string.
 */
function formatCoreRank(coreRank?: string): string | null {
  if (!coreRank) return null;
  const clean = coreRank.trim();
  if (clean.toLowerCase().startsWith('core')) {
    return clean;
  }
  return `Core ${clean}`;
}

/**
 * Fetches CCF deadlines dataset from official GitHub-hosted repository/build.
 */
export async function fetchCCFDeadlines(): Promise<RawDiscoveredItem[]> {
  const now = new Date();
  if (inRunCache && now.getTime() - inRunCacheTimestamp < CACHE_TTL_MS) {
    return inRunCache;
  }

  const results: RawDiscoveredItem[] = [];

  // Try official assembled allconf.json first (fastest and complete)
  const primaryUrl = 'https://raw.githubusercontent.com/ccfddl/ccfddl.github.io/page/conference/allconf.json';
  
  let rawData: CCFConferenceItem[] = [];

  try {
    const res = await fetch(primaryUrl, {
      headers: {
        'User-Agent': 'TechOpportunityTracker/1.0 (+https://github.com/sanvisharma850/tech-opportunity-tracker)',
      },
    });

    if (res.ok) {
      rawData = await res.json();
    } else if (res.status === 403 || res.status === 429) {
      console.warn(`CCF Deadlines primary endpoint rate limited (${res.status}), attempting fallback YAMLs`);
    }
  } catch (err) {
    console.warn('CCF Deadlines primary fetch error, attempting fallback YAMLs:', err);
  }

  // Fallback: fetch individual key conference YAMLs directly from raw.githubusercontent.com if primary failed
  if (!rawData || rawData.length === 0) {
    const fallbackConfs = [
      { sub: 'DB', file: 'sigmod' },
      { sub: 'DB', file: 'vldb' },
      { sub: 'DB', file: 'icde' },
      { sub: 'AI', file: 'aaai' },
      { sub: 'AI', file: 'ijcai' },
      { sub: 'AI', file: 'cvpr' },
      { sub: 'AI', file: 'iccv' },
      { sub: 'AI', file: 'icml' },
      { sub: 'AI', file: 'nips' },
      { sub: 'AI', file: 'acl' },
      { sub: 'SE', file: 'icse' },
      { sub: 'SE', file: 'fse' },
      { sub: 'SE', file: 'ase' },
      { sub: 'NW', file: 'sigcomm' },
      { sub: 'NW', file: 'infocom' },
      { sub: 'SC', file: 'sp' },
      { sub: 'SC', file: 'ccs' },
    ];

    for (const conf of fallbackConfs) {
      try {
        const yamlUrl = `https://raw.githubusercontent.com/ccfddl/ccf-deadlines/main/conference/${conf.sub}/${conf.file}.yml`;
        const res = await fetch(yamlUrl);
        if (res.ok) {
          const text = await res.text();
          const parsed = yaml.parse(text);
          if (Array.isArray(parsed)) {
            rawData.push(...parsed);
          } else if (parsed && typeof parsed === 'object') {
            rawData.push(parsed as CCFConferenceItem);
          }
        }
      } catch (e) {
        // Continue with remaining YAMLs
      }
    }
  }

  // Process conferences and editions
  for (const conf of rawData) {
    if (!conf.confs || !Array.isArray(conf.confs)) continue;

    for (const edition of conf.confs) {
      // Must have official link from dataset record; never construct or guess
      if (!edition.link || typeof edition.link !== 'string' || !edition.link.startsWith('http')) {
        continue;
      }

      // Parse conference dates
      const { startDate, endDate, isAmbiguous } = parseConferenceDateRange(edition.date, edition.year);

      // Parse submission deadline
      let latestUpcomingDeadline: string | null = null;
      let hasFutureDeadline = false;

      if (edition.timeline && Array.isArray(edition.timeline)) {
        for (const t of edition.timeline) {
          if (!t.deadline || t.deadline.toUpperCase() === 'TBD') continue;

          const norm = normalizeTimezoneToUTC(t.deadline, edition.timezone);
          if (norm.isoUtc) {
            const ddlDate = new Date(norm.isoUtc);
            if (ddlDate.getTime() > now.getTime()) {
              hasFutureDeadline = true;
              if (!latestUpcomingDeadline || ddlDate.getTime() < new Date(latestUpcomingDeadline).getTime()) {
                latestUpcomingDeadline = norm.isoUtc;
              }
            } else if (!latestUpcomingDeadline) {
              latestUpcomingDeadline = norm.isoUtc;
            }
          }
        }
      }

      // Check if conference is in the future
      let isFutureConference = false;
      if (endDate) {
        const endDt = new Date(endDate);
        if (endDt.getTime() >= now.getTime()) {
          isFutureConference = true;
        }
      } else if (edition.year >= now.getFullYear()) {
        isFutureConference = true;
      }

      // Include only entries with future deadline or future conference date
      if (!hasFutureDeadline && !isFutureConference) {
        continue;
      }

      const reasons: string[] = [
        'dates from community-maintained dataset, not re-confirmed against organizer site',
      ];
      let forceLow = false;

      if (isAmbiguous || !startDate || !endDate) {
        forceLow = true;
        reasons.push('Start or end conference date is missing, tentative, or unparseable from dataset');
      }

      const confTier = formatCoreRank(conf.rank?.core);
      if (confTier) {
        reasons.push(`CORE rank "${confTier}" extracted from ccf-deadlines metadata`);
      }

      const title = conf.description
        ? `${conf.title} ${edition.year}: ${conf.description}`
        : `${conf.title} ${edition.year}`;

      results.push({
        title,
        type: 'conference',
        conference_tier: confTier || 'Industry / Non-Academic',
        subfield: mapCCFSubToCategory(conf.sub),
        organizer: conf.sub ? `CCF-${conf.sub} / ${conf.title} Steering Committee` : `${conf.title} Committee`,
        start_date: startDate || `${edition.year}-01-01`,
        end_date: endDate || `${edition.year}-12-31`,
        submission_deadline: latestUpcomingDeadline,
        format: edition.place && edition.place.toLowerCase().includes('online') ? 'hybrid' : 'in-person',
        location: edition.place || null as any,
        source_url: edition.link.trim(),
        description: `Official call for papers and registration for ${conf.title} ${edition.year}${
          conf.description ? ` (${conf.description})` : ''
        }.${edition.place ? ` Location: ${edition.place}.` : ''} Source dataset: CCF-Deadlines.`,
        confidence_reasons: reasons,
        force_low_confidence: forceLow,
        origin: 'adapter',
      });
    }
  }

  inRunCache = results;
  inRunCacheTimestamp = now.getTime();
  return results;
}
