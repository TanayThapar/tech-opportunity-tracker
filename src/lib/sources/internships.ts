/**
 * Source Adapter: Tech Internships Web Crawler
 *
 * Scrapes verified software engineering, AI/ML, and quant internship listings
 * from the open-source Pitt CSC & Simplify internships repository.
 * Data includes company name, specific role, location, and direct application links.
 *
 * Attribution:
 *   Data sourced from Pitt Computer Science Club & Simplify open GitHub repository
 *   (https://github.com/SimplifyJobs/Summer2025-Internships).
 */

import { RawDiscoveredItem } from '@/lib/sources';

let inRunCache: RawDiscoveredItem[] | null = null;
let inRunCacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches upcoming tech internships by parsing the curated community repository.
 */
export async function fetchLiveInternships(limit = 40): Promise<RawDiscoveredItem[]> {
  const now = new Date();
  if (inRunCache && now.getTime() - inRunCacheTimestamp < CACHE_TTL_MS) {
    return inRunCache.slice(0, limit);
  }

  const results: RawDiscoveredItem[] = [];
  const urls = [
    'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md',
    'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md',
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'TechOpportunityTracker/1.0 (+https://github.com/sanvisharma850/tech-opportunity-tracker)',
        },
      });

      if (!res.ok) {
        continue;
      }

      const html = await res.text();

      // Regex to extract table row: Company, Role, Location, Apply Link
      const rowRegex = /<tr>\s*<td>(?:🔥\s*)?<strong><a href="[^"]+">([^<]+)<\/a><\/strong><\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td><div align="center"><a href="([^"]+)"/g;
      let match: RegExpExecArray | null;

      while ((match = rowRegex.exec(html)) !== null) {
        const company = match[1].trim();
        const rawRole = match[2].trim().replace(/🎓|🔒|🔥/g, '').trim();
        const location = match[3].trim();
        const applyUrl = match[4].trim();

        // Must have valid HTTP URL
        if (!applyUrl.startsWith('http')) {
          continue;
        }

        // Determine format from location
        let format: 'in-person' | 'online' | 'hybrid' = 'in-person';
        const locLower = location.toLowerCase();
        if (locLower.includes('remote') || locLower.includes('virtual')) {
          format = 'online';
        } else if (locLower.includes('hybrid')) {
          format = 'hybrid';
        }

        const startDate = now.toISOString().slice(0, 10);
        // Default future end date for rolling applications (approx 120 days)
        const futureDate = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
        const endDate = futureDate.toISOString().slice(0, 10);

        results.push({
          title: `${company}: ${rawRole}`,
          type: 'internship',
          organizer: company,
          company: company,
          start_date: startDate,
          end_date: endDate,
          submission_deadline: null, // Rolling applications
          format: format,
          location: location,
          source_url: applyUrl,
          description: `${rawRole} at ${company} (${location}). Opportunity discovered via Pitt CSC & Simplify open tech internships index with direct applicant link.`,
          confidence_reasons: [
            'Parsed from verified Pitt CSC & Simplify open internships dataset',
            'Direct employer/ATS application requisition URL',
            'no application deadline listed (rolling evaluation)',
          ],
          force_low_confidence: false,
          origin: 'adapter',
          work_mode: format,
          posted_date: startDate,
        });

        if (results.length >= limit) {
          break;
        }
      }

      if (results.length > 0) {
        break;
      }
    } catch (err) {
      console.warn(`Failed to crawl internships from ${url}:`, err);
    }
  }

  inRunCache = results;
  inRunCacheTimestamp = now.getTime();
  return results.slice(0, limit);
}
