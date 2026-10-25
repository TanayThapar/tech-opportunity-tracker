/**
 * RFC 5545 iCalendar (WebCal / .ics) Generator
 * 
 * Provides standards-compliant iCalendar calendar feeds for Google Calendar,
 * Apple Calendar, Microsoft Outlook, and standard calendar clients.
 */

import { TechOpportunity } from '@/types';

/**
 * Escapes characters for iCalendar text values (RFC 5545 Section 3.3.11).
 */
export function escapeICalText(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Formats a date string into an iCalendar UTC timestamp: YYYYMMDDTHHMMSSZ.
 * Handles both YYYY-MM-DD and full ISO strings.
 */
export function formatICalDate(dateStr: string, isEndOfDay = false): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // Fallback for YYYY-MM-DD
      const clean = dateStr.replace(/-/g, '').slice(0, 8);
      return `${clean}T${isEndOfDay ? '235959' : '000000'}Z`;
    }
    // If the input was only YYYY-MM-DD, set appropriate time
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(5, 7);
      const day = dateStr.slice(8, 10);
      return `${year}${month}${day}T${isEndOfDay ? '235959' : '000000'}Z`;
    }

    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  } catch {
    const clean = dateStr.replace(/[^0-9]/g, '').slice(0, 8);
    return `${clean}T000000Z`;
  }
}

/**
 * Folds iCalendar lines exceeding 75 octets with CRLF + space as per RFC 5545 Section 3.1.
 */
export function foldICalLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    parts.push(' ' + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return parts.join('\r\n');
}

export interface ICalFeedOptions {
  calName?: string;
  calDesc?: string;
  includeDeadlines?: boolean;
  includeEvents?: boolean;
}

/**
 * Generates an RFC 5545 compliant VCALENDAR string.
 */
export function generateICalFeed(
  opportunities: TechOpportunity[],
  options: ICalFeedOptions = {}
): string {
  const {
    calName = 'Tech Opportunities & Deadlines',
    calDesc = 'Live verified tech conferences, workshops, hackathons, and deadlines',
    includeDeadlines = true,
    includeEvents = true,
  } = options;

  const nowStamp = formatICalDate(new Date().toISOString());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tech Opportunity Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICalText(calName)}`,
    `X-WR-CALDESC:${escapeICalText(calDesc)}`,
    'X-WR-TIMEZONE:UTC',
  ];

  for (const opp of opportunities) {
    // 1. Generate Submission / Application Deadline Event (with Alarm)
    const deadlineStr = opp.submission_deadline || opp.application_deadline;
    if (includeDeadlines && deadlineStr) {
      const dtStart = formatICalDate(deadlineStr, false);
      const dtEnd = formatICalDate(deadlineStr, true);
      const isJob = opp.type === 'job' || opp.type === 'internship';
      const deadlineLabel = isJob ? 'APPLY BY' : 'CFP DEADLINE';
      const summary = `⏳ [${deadlineLabel}] ${opp.title}`;
      const desc = `${opp.organizer ? `Organizer: ${opp.organizer}\\n` : ''}${
        opp.conference_tier ? `Tier: ${opp.conference_tier}\\n` : ''
      }${opp.subfield ? `Track: ${opp.subfield}\\n` : ''}${
        opp.description ? `\\n${escapeICalText(opp.description)}\\n` : ''
      }\\nSource: ${opp.source_url}`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:opp-${opp.id}-deadline@tech-opportunity-tracker`);
      lines.push(`DTSTAMP:${nowStamp}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${escapeICalText(summary)}`);
      lines.push(`DESCRIPTION:${desc}`);
      lines.push(`URL:${opp.source_url}`);
      if (opp.location) {
        lines.push(`LOCATION:${escapeICalText(opp.location)}`);
      }
      lines.push('STATUS:CONFIRMED');

      // 24-hour reminder alarm
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-P1D');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:Reminder: ${escapeICalText(opp.title)} deadline is tomorrow!`);
      lines.push('END:VALARM');

      // 7-day reminder alarm
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-P7D');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:Reminder: ${escapeICalText(opp.title)} deadline in 1 week.`);
      lines.push('END:VALARM');

      lines.push('END:VEVENT');
    }

    // 2. Generate Conference / Workshop / Hackathon Event Range
    if (includeEvents && opp.start_date && opp.end_date) {
      const dtStart = formatICalDate(opp.start_date, false);
      const dtEnd = formatICalDate(opp.end_date, true);
      const typeLabel = opp.type.toUpperCase();
      const summary = `🗓️ [${typeLabel}] ${opp.title}`;
      const desc = `${opp.organizer ? `Organizer: ${opp.organizer}\\n` : ''}${
        opp.conference_tier ? `Tier: ${opp.conference_tier}\\n` : ''
      }${opp.subfield ? `Track: ${opp.subfield}\\n` : ''}${
        opp.description ? `\\n${escapeICalText(opp.description)}\\n` : ''
      }\\nSource: ${opp.source_url}`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:opp-${opp.id}-event@tech-opportunity-tracker`);
      lines.push(`DTSTAMP:${nowStamp}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${escapeICalText(summary)}`);
      lines.push(`DESCRIPTION:${desc}`);
      lines.push(`URL:${opp.source_url}`);
      if (opp.location) {
        lines.push(`LOCATION:${escapeICalText(opp.location)}`);
      }
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');

  return lines.map(foldICalLine).join('\r\n') + '\r\n';
}

// Aliases for convenience
export const escapeIcsText = escapeICalText;
export const formatIcsDate = formatICalDate;
export const foldIcsLine = foldICalLine;
export const generateIcsFeed = generateICalFeed;

