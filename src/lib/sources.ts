/**
 * Unified Live Sources Aggregator
 *
 * Integrates independent adapters:
 * 1. CCF Deadlines (Computer Science Conferences & CORE Tiers)
 * 2. AI Deadlines (Machine Learning & AI Conferences)
 * 3. Regular Job & Career Listings (JPMorgan Chase, Samsung, etc.)
 *
 * Failures in any single adapter are isolated and do not abort the pipeline.
 */

import { OpportunityType, OpportunityOrigin, LinkStatus, ListingStatus, OpportunityFormat } from '@/types';
import { fetchCCFDeadlines } from '@/lib/sources/ccfddl';
import { fetchAIDeadlines } from '@/lib/sources/aiDeadlines';
import { fetchCuratedJobs } from '@/lib/sources/jobs';
import { fetchMLHHackathons } from '@/lib/sources/hackathons';
import { fetchLiveInternships } from '@/lib/sources/internships';

export interface RawDiscoveredItem {
  title: string;
  type: OpportunityType;
  conference_tier?: string | null;
  subfield?: string | null;
  organizer: string;
  start_date: string;
  end_date: string;
  submission_deadline?: string | null;
  format: OpportunityFormat;
  location?: string | null;
  source_url: string;
  description: string;
  confidence_reasons: string[];
  force_low_confidence?: boolean;
  origin?: OpportunityOrigin;

  // Job specific fields
  company?: string;
  posted_date?: string | null;
  application_deadline?: string | null;
  link_status?: LinkStatus;
  last_checked_at?: string | null;
  listing_status?: ListingStatus;
  work_mode?: OpportunityFormat;
}

export interface AdapterFetchResult {
  items: RawDiscoveredItem[];
  errors: string[];
}

/**
 * Fetches candidate opportunities from all active structured adapters.
 * Each adapter is wrapped in a try/catch block so a network error or rate limit
 * in one source never crashes the entire discovery run.
 */
export async function fetchLiveWebFeedsWithErrors(): Promise<AdapterFetchResult> {
  const allItems: RawDiscoveredItem[] = [];
  const errors: string[] = [];

  // Adapter 1: CCF Deadlines
  try {
    const ccfItems = await fetchCCFDeadlines();
    allItems.push(...ccfItems);
  } catch (err: any) {
    const msg = `CCF Deadlines adapter error: ${err.message || String(err)}`;
    console.error(msg);
    errors.push(msg);
  }

  // Adapter 2: AI Deadlines
  try {
    const aiItems = await fetchAIDeadlines();
    allItems.push(...aiItems);
  } catch (err: any) {
    const msg = `AI Deadlines adapter error: ${err.message || String(err)}`;
    console.error(msg);
    errors.push(msg);
  }

  // Adapter 3: Regular Job Listings
  try {
    const jobItems = await fetchCuratedJobs();
    allItems.push(...jobItems);
  } catch (err: any) {
    const msg = `Jobs adapter error: ${err.message || String(err)}`;
    console.error(msg);
    errors.push(msg);
  }

  // Adapter 4: MLH Hackathons Web Crawler
  try {
    const hackathonItems = await fetchMLHHackathons();
    allItems.push(...hackathonItems);
  } catch (err: any) {
    const msg = `MLH Hackathons crawler error: ${err.message || String(err)}`;
    console.error(msg);
    errors.push(msg);
  }

  // Adapter 5: Open Tech Internships Web Crawler
  try {
    const internshipItems = await fetchLiveInternships();
    allItems.push(...internshipItems);
  } catch (err: any) {
    const msg = `Internships crawler error: ${err.message || String(err)}`;
    console.error(msg);
    errors.push(msg);
  }

  return { items: allItems, errors };
}

/**
 * Standard fetchLiveWebFeeds contract returning Promise<RawDiscoveredItem[]>
 */
export async function fetchLiveWebFeeds(): Promise<RawDiscoveredItem[]> {
  const { items } = await fetchLiveWebFeedsWithErrors();
  return items;
}
