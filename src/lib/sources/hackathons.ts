/**
 * Source Adapter: Major League Hacking (MLH) Hackathons Crawler
 *
 * Scrapes official scheduled hackathons from MLH (Major League Hacking).
 * Data includes event names, start/end dates, format (in-person/online),
 * location, and official event URLs.
 *
 * Attribution:
 *   Data sourced from Major League Hacking (mlh.io).
 *   Dates and locations are community-organized collegiate and open hackathons.
 */

import { RawDiscoveredItem } from '@/lib/sources';

let inRunCache: RawDiscoveredItem[] | null = null;
let inRunCacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches upcoming hackathons by crawling MLH seasonal schedules.
 */
export async function fetchMLHHackathons(): Promise<RawDiscoveredItem[]> {
  const now = new Date();
  if (inRunCache && now.getTime() - inRunCacheTimestamp < CACHE_TTL_MS) {
    return inRunCache;
  }

  const results: RawDiscoveredItem[] = [];
  const seasonsToCrawl = [2026, 2025];

  for (const season of seasonsToCrawl) {
    const pageUrl = `https://mlh.io/seasons/${season}/events`;
    try {
      const res = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'TechOpportunityTracker/1.0 (+https://github.com/sanvisharma850/tech-opportunity-tracker)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      if (!res.ok) {
        continue;
      }

      const html = await res.text();

      // Flexible extraction matching JSON event blocks
      const blockRegex = /\{[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*"startsAt"\s*:\s*"([^"]+)"[^{}]*"endsAt"\s*:\s*"([^"]+)"[^{}]*\}/g;
      let match: RegExpExecArray | null;

      while ((match = blockRegex.exec(html)) !== null) {
        const block = match[0];
        const rawName = match[1];
        const startsAt = match[2];
        const endsAt = match[3];

        // Skip ended hackathons
        const endDateObj = new Date(endsAt);
        if (endDateObj.getTime() < now.getTime()) {
          continue;
        }

        // Extract URL
        const urlMatch = block.match(/"url"\s*:\s*"([^"]+)"/);
        let rawUrl = urlMatch ? urlMatch[1].replace(/\\\//g, '/') : `/events/${season}`;
        if (rawUrl.startsWith('/')) {
          rawUrl = `https://mlh.io${rawUrl}`;
        }

        // Extract location
        const locMatch = block.match(/"location"\s*:\s*"([^"]+)"/);
        const location = locMatch ? locMatch[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        ) : null;

        // Extract formatType
        const fmtMatch = block.match(/"formatType"\s*:\s*"([^"]+)"/);
        const formatType = fmtMatch ? fmtMatch[1].toLowerCase() : 'physical';
        const format = formatType === 'digital' ? 'online' : 'in-person';

        const name = rawName.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        );

        // Deduplicate within run
        if (results.some(r => r.title === name)) {
          continue;
        }

        results.push({
          title: name,
          type: 'hackathon',
          organizer: 'Major League Hacking',
          start_date: startsAt.slice(0, 10),
          end_date: endsAt.slice(0, 10),
          submission_deadline: startsAt,
          format: format as 'in-person' | 'online',
          location: location || (format === 'online' ? 'Everywhere (Virtual)' : null),
          source_url: rawUrl,
          description: `${name} is an official collegiate hackathon hosted on the Major League Hacking league schedule in ${location || 'online'}. Participants collaborate in teams to build technical software and hardware projects.`,
          confidence_reasons: [
            'Parsed from official Major League Hacking (MLH) schedule',
            `Format: ${format}, Location: ${location || 'Virtual'}`,
          ],
          force_low_confidence: false,
          origin: 'adapter',
        });
      }

      if (results.length > 0) {
        break;
      }
    } catch (err) {
      console.warn(`Failed to crawl MLH season ${season}:`, err);
    }
  }

  inRunCache = results;
  inRunCacheTimestamp = now.getTime();
  return results;
}
