import { describe, it, expect } from 'vitest';
import { normalizeTimezoneToUTC, parseTimezoneOffsetHours } from '@/lib/timezone';

describe('Deadline Timezone Normalization', () => {
  it('correctly maps AoE (Anywhere on Earth) to UTC-12', () => {
    expect(parseTimezoneOffsetHours('AoE')).toBe(-12);
    expect(parseTimezoneOffsetHours('aoe')).toBe(-12);
    expect(parseTimezoneOffsetHours('UTC-12')).toBe(-12);
  });

  it('normalizes an AoE deadline to UTC (+12 hours from local time)', () => {
    // 2026-10-25 23:59:59 in AoE (UTC-12) corresponds to 2026-10-26 11:59:59 UTC
    const result = normalizeTimezoneToUTC('2026-10-25 23:59:59', 'AoE');
    expect(result.isValid).toBe(true);
    expect(result.offsetApplied).toBe(-12);
    expect(result.isoUtc).toBe('2026-10-26T11:59:59.000Z');
  });

  it('normalizes UTC and positive offset timezones', () => {
    const utcResult = normalizeTimezoneToUTC('2026-06-15 17:00:00', 'UTC');
    expect(utcResult.isValid).toBe(true);
    expect(utcResult.offsetApplied).toBe(0);
    expect(utcResult.isoUtc).toBe('2026-06-15T17:00:00.000Z');

    // UTC+8: 17:00 local is 09:00 UTC
    const result8 = normalizeTimezoneToUTC('2026-06-15 17:00:00', 'UTC+8');
    expect(result8.isValid).toBe(true);
    expect(result8.offsetApplied).toBe(8);
    expect(result8.isoUtc).toBe('2026-06-15T09:00:00.000Z');
  });

  it('handles already-formatted ISO UTC strings with Z suffix', () => {
    const isoString = '2026-11-20T23:59:59.000Z';
    const result = normalizeTimezoneToUTC(isoString);
    expect(result.isValid).toBe(true);
    expect(result.isoUtc).toBe(isoString);
  });

  it('handles malformed and unrecognized timezone strings gracefully without crashing', () => {
    const malformedTz = normalizeTimezoneToUTC('2026-10-25 23:59:59', 'INVALID_TIMEZONE_XYZ');
    expect(malformedTz.isValid).toBe(false);
    expect(malformedTz.warning).toContain('INVALID_TIMEZONE_XYZ');
    // Should still provide a safe fallback UTC timestamp
    expect(malformedTz.isoUtc).toBe('2026-10-25T23:59:59.000Z');

    const emptyDate = normalizeTimezoneToUTC('', 'AoE');
    expect(emptyDate.isValid).toBe(false);
    expect(emptyDate.isoUtc).toBeNull();

    const gibberishDate = normalizeTimezoneToUTC('not-a-date', 'AoE');
    expect(gibberishDate.isValid).toBe(false);
    expect(gibberishDate.isoUtc).toBeNull();
  });
});
