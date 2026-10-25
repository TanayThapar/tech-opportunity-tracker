/**
 * Source Adapter: AI Deadlines (Machine Learning & AI Conferences)
 *
 * API Descriptor: https://mlciv.com/ai-deadlines/api/
 * Endpoint: https://mlciv.com/ai-deadlines/api/upcoming.json
 * License: MIT License
 * Attribution:
 *   Copyright (c) 2021 Abhishek Das
 *   Data sourced from ai-deadlines project (https://github.com/mlciv/ai-deadlines).
 *   Dates and deadlines are community-maintained, not re-confirmed against organizer sites.
 */

import { RawDiscoveredItem } from '@/lib/sources';
import { normalizeTimezoneToUTC } from '@/lib/timezone';
import { parseConferenceDateRange } from '@/lib/dateUtils';

let inRunCache: RawDiscoveredItem[] | null = null;
let inRunCacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface AIDeadlineRecord {
  title: string;
  year: number;
  id: string;
  full_name?: string;
  link: string;
  deadline?: string;
  abstract_deadline?: string;
  timezone?: string;
  place?: string;
  date?: string;
  start?: string;
  end?: string;
  sub?: string[];
  note?: string;
  hindex?: number;
}

export async function fetchAIDeadlines(): Promise<RawDiscoveredItem[]> {
  const now = new Date();
  if (inRunCache && now.getTime() - inRunCacheTimestamp < CACHE_TTL_MS) {
    return inRunCache;
  }

  const endpoint = 'https://mlciv.com/ai-deadlines/api/upcoming.json';
  let records: AIDeadlineRecord[] = [];

  const res = await fetch(endpoint, {
    headers: {
      'User-Agent': 'TechOpportunityTracker/1.0 (+https://github.com/sanvisharma850/tech-opportunity-tracker)',
    },
  });

  if (!res.ok) {
    throw new Error(`ai-deadlines API responded with status ${res.status}: ${res.statusText}`);
  }

  records = await res.json();
  const results: RawDiscoveredItem[] = [];

  for (const item of records) {
    // source_url must come from dataset record; never construct or guess
    if (!item.link || typeof item.link !== 'string' || !item.link.startsWith('http')) {
      continue;
    }

    const reasons: string[] = [
      'dates from community-maintained dataset, not re-confirmed against organizer site',
    ];
    let forceLow = false;

    // Normalize submission deadline
    let submissionDeadline: string | null = null;
    let hasFutureDeadline = false;

    if (item.deadline && item.deadline.toUpperCase() !== 'TBD') {
      const norm = normalizeTimezoneToUTC(item.deadline, item.timezone);
      if (norm.isoUtc) {
        submissionDeadline = norm.isoUtc;
        if (new Date(norm.isoUtc).getTime() > now.getTime()) {
          hasFutureDeadline = true;
        }
        if (norm.offsetApplied !== null) {
          reasons.push(
            item.timezone?.toUpperCase() === 'AOE'
              ? 'submission deadline normalized from AoE (UTC-12) to UTC'
              : `submission deadline normalized from ${item.timezone} to UTC`
          );
        }
      } else {
        forceLow = true;
        reasons.push(`Submission deadline "${item.deadline}" could not be parsed`);
      }
    } else {
      reasons.push('No specific submission deadline listed in ai-deadlines record');
    }

    // Determine start and end dates
    let startDate: string | null = item.start || null;
    let endDate: string | null = item.end || null;

    if (!startDate || !endDate) {
      const parsedRange = parseConferenceDateRange(item.date, item.year);
      if (!startDate) startDate = parsedRange.startDate;
      if (!endDate) endDate = parsedRange.endDate;
      if (parsedRange.isAmbiguous) {
        forceLow = true;
        reasons.push(`Conference date range "${item.date || 'unknown'}" is tentative or unparseable`);
      }
    }

    if (!startDate || !endDate) {
      forceLow = true;
      reasons.push('Conference start or end date missing from record');
      startDate = startDate || `${item.year}-01-01`;
      endDate = endDate || `${item.year}-12-31`;
    }

    // Check if conference is in the future
    let isFutureConference = false;
    if (endDate) {
      const endDt = new Date(endDate);
      if (endDt.getTime() >= now.getTime()) {
        isFutureConference = true;
      }
    } else if (item.year >= now.getFullYear()) {
      isFutureConference = true;
    }

    // Include only entries with future deadline or future conference date
    if (!hasFutureDeadline && !isFutureConference) {
      continue;
    }

    const title = item.full_name
      ? `${item.title} ${item.year}: ${item.full_name}`
      : `${item.title} ${item.year}`;

    results.push({
      title,
      type: 'conference',
      conference_tier: 'Core A*', // Most AI-deadlines entries are top-tier AI/ML conferences
      subfield: 'AI / Machine Learning',
      organizer: item.full_name ? `${item.title} Organizing Committee` : 'AI Conference Committee',
      start_date: startDate,
      end_date: endDate,
      submission_deadline: submissionDeadline,
      format: item.place && item.place.toLowerCase().includes('online') ? 'hybrid' : 'in-person',
      location: item.place || null as any,
      source_url: item.link.trim(),
      description: `Official call for papers and registration for ${title}.${
        item.place ? ` Location: ${item.place}.` : ''
      }${item.note ? ` Note: ${item.note.replace(/<[^>]*>?/gm, '')}` : ''} Source dataset: ai-deadlines.`,
      confidence_reasons: reasons,
      force_low_confidence: forceLow,
      origin: 'adapter',
    });
  }

  inRunCache = results;
  inRunCacheTimestamp = now.getTime();
  return results;
}
