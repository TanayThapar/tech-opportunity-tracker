/**
 * Timezone normalization utilities for deadline processing.
 * Normalizes deadline strings and arbitrary timezones to UTC ISO 8601 strings.
 * Explicitly maps "AoE" (Anywhere on Earth) to UTC-12.
 */

// Common timezone offsets in hours relative to UTC
const TIMEZONE_OFFSET_MAP: Record<string, number> = {
  aoe: -12,
  'utc-12': -12,
  'gmt-12': -12,
  'utc-11': -11,
  'utc-10': -10,
  hst: -10,
  akst: -9,
  akdt: -8,
  pst: -8,
  pdt: -7,
  pt: -8, // Default PT to standard PST (or -7 if PDT)
  mst: -7,
  mdt: -6,
  mt: -7,
  cst: -6,
  cdt: -5,
  ct: -6,
  est: -5,
  edt: -4,
  et: -5,
  ast: -4,
  utc: 0,
  gmt: 0,
  wet: 0,
  cet: 1,
  cest: 2,
  eet: 2,
  eest: 3,
  msk: 3,
  ist: 5.5,
  'utc+8': 8,
  cst_china: 8,
  jst: 9,
  kst: 9,
  aest: 10,
  aedt: 11,
  nzst: 12,
};

/**
 * Parses timezone string into hours offset from UTC.
 * Returns null if timezone string is malformed or unrecognizable.
 */
export function parseTimezoneOffsetHours(tzStr?: string | null): number | null {
  if (!tzStr || typeof tzStr !== 'string') return null;

  const clean = tzStr.trim().toLowerCase();

  // 1. Check known aliases (including 'aoe')
  if (clean in TIMEZONE_OFFSET_MAP) {
    return TIMEZONE_OFFSET_MAP[clean];
  }

  // 2. Check regex for UTC/GMT with sign: e.g. "utc-12", "utc+05:30", "gmt+8", "+08:00", "-07"
  const offsetMatch = clean.match(/(?:utc|gmt)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?/);
  if (offsetMatch) {
    const sign = offsetMatch[1] === '-' ? -1 : 1;
    const hours = parseInt(offsetMatch[2], 10);
    const minutes = offsetMatch[3] ? parseInt(offsetMatch[3], 10) : 0;
    if (hours <= 14 && minutes < 60) {
      return sign * (hours + minutes / 60);
    }
  }

  // 3. IANA timezone check (e.g. "America/Los_Angeles", "Asia/Kolkata", "Europe/London")
  try {
    // Test if valid IANA timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tzStr.trim(),
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find(p => p.type === 'timeZoneName')?.value;
    if (tzPart) {
      const match = tzPart.match(/GMT([+-]\d+)(?::(\d+))?/);
      if (match) {
        const h = parseInt(match[1], 10);
        const m = match[2] ? parseInt(match[2], 10) : 0;
        return h + (h >= 0 ? m / 60 : -m / 60);
      }
      if (tzPart === 'GMT' || tzPart === 'UTC') return 0;
    }
  } catch {
    // Not a valid IANA timezone
  }

  return null;
}

export interface NormalizeTimezoneResult {
  isoUtc: string | null;
  isValid: boolean;
  offsetApplied: number | null;
  warning?: string;
}

/**
 * Normalizes a deadline datetime string and timezone into an ISO 8601 UTC string.
 * Example inputs:
 *  - ("2026-10-25 23:59:59", "AoE") -> "2026-10-26T11:59:59.000Z"
 *  - ("2026-08-18 23:59:59", "America/Los_Angeles")
 *  - ("2026-05-15", "UTC")
 */
export function normalizeTimezoneToUTC(
  dateStr: string,
  tzStr?: string | null
): NormalizeTimezoneResult {
  if (!dateStr || typeof dateStr !== 'string') {
    return { isoUtc: null, isValid: false, offsetApplied: null, warning: 'Empty date string' };
  }

  const cleanDate = dateStr.trim();

  // If already standard ISO with 'Z' suffix: e.g. "2026-10-25T11:59:59.000Z"
  if (cleanDate.endsWith('Z') && !isNaN(Date.parse(cleanDate))) {
    return {
      isoUtc: new Date(cleanDate).toISOString(),
      isValid: true,
      offsetApplied: 0,
    };
  }

  // Parse YYYY-MM-DD or YYYY-MM-DD HH:mm:ss
  const match = cleanDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (!match) {
    // Try generic parse
    const parsed = Date.parse(cleanDate);
    if (isNaN(parsed)) {
      return {
        isoUtc: null,
        isValid: false,
        offsetApplied: null,
        warning: `Unparseable date string "${dateStr}"`,
      };
    }
    return {
      isoUtc: new Date(parsed).toISOString(),
      isValid: true,
      offsetApplied: null,
      warning: 'Fallback standard parse applied without explicit timezone',
    };
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-indexed
  const day = parseInt(match[3], 10);
  const hour = match[4] ? parseInt(match[4], 10) : 23;
  const minute = match[5] ? parseInt(match[5], 10) : 59;
  const second = match[6] ? parseInt(match[6], 10) : 59;

  // Determine timezone offset
  const offsetHours = parseTimezoneOffsetHours(tzStr);

  if (offsetHours === null) {
    // Treat as UTC but flag warning
    const utcMs = Date.UTC(year, month, day, hour, minute, second);
    return {
      isoUtc: new Date(utcMs).toISOString(),
      isValid: false,
      offsetApplied: 0,
      warning: tzStr
        ? `Unrecognized or malformed timezone "${tzStr}"; defaulted to UTC`
        : 'No timezone specified; defaulted to UTC',
    };
  }

  // Convert local time to UTC:
  // local_time = UTC + offset  =>  UTC = local_time - offset
  // For AoE (offset = -12): UTC = local_time - (-12) = local_time + 12 hours
  const localMs = Date.UTC(year, month, day, hour, minute, second);
  const utcMs = localMs - offsetHours * 60 * 60 * 1000;

  return {
    isoUtc: new Date(utcMs).toISOString(),
    isValid: true,
    offsetApplied: offsetHours,
  };
}
