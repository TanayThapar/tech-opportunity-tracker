/**
 * Date parsing utilities for parsing natural language conference date strings
 * (e.g. "February 16-23, 2027", "May 31-June 2, 2026", "October 25, 2026", "July 2027", "Summer 2027")
 * into standard ISO date strings.
 */

const MONTHS: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

function formatIso(year: number, monthZeroIndexed: number, day: number): string {
  const m = String(monthZeroIndexed + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function getDaysInMonth(year: number, monthZeroIndexed: number): number {
  return new Date(Date.UTC(year, monthZeroIndexed + 1, 0)).getUTCDate();
}

export function parseConferenceDateRange(
  dateStr?: string | null,
  fallbackYear?: number
): { startDate: string | null; endDate: string | null; isAmbiguous: boolean } {
  if (!dateStr || typeof dateStr !== 'string') {
    return { startDate: null, endDate: null, isAmbiguous: true };
  }

  const clean = dateStr.trim();
  if (
    clean.toLowerCase() === 'tbd' ||
    clean.toLowerCase() === 'tba' ||
    clean.toLowerCase() === 'cancelled' ||
    clean.toLowerCase() === 'canceled'
  ) {
    return { startDate: null, endDate: null, isAmbiguous: true };
  }

  // If already standard ISO range: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return { startDate: clean, endDate: clean, isAmbiguous: false };
  }

  // Extract year if specified at end, e.g. ", 2027" or " 2027"
  let year = fallbackYear || new Date().getFullYear();
  const yearMatch = clean.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  }

  // Pattern 1: "February 16-23, 2027" or "Feb 16 - 23, 2027"
  const singleMonthRange = clean.match(/([a-zA-Z]+)\s+(\d{1,2})\s*[-–—]\s*(\d{1,2})/);
  if (singleMonthRange) {
    const monthKey = singleMonthRange[1].toLowerCase();
    if (monthKey in MONTHS) {
      const month = MONTHS[monthKey];
      const startDay = parseInt(singleMonthRange[2], 10);
      const endDay = parseInt(singleMonthRange[3], 10);
      return {
        startDate: formatIso(year, month, startDay),
        endDate: formatIso(year, month, endDay),
        isAmbiguous: false,
      };
    }
  }

  // Pattern 2: "May 31-June 2, 2026" or "February 27 - March 2, 2025"
  const multiMonthRange = clean.match(/([a-zA-Z]+)\s+(\d{1,2})\s*[-–—]\s*([a-zA-Z]+)\s+(\d{1,2})/);
  if (multiMonthRange) {
    const m1 = multiMonthRange[1].toLowerCase();
    const m2 = multiMonthRange[3].toLowerCase();
    if (m1 in MONTHS && m2 in MONTHS) {
      const startMonth = MONTHS[m1];
      const endMonth = MONTHS[m2];
      const startDay = parseInt(multiMonthRange[2], 10);
      const endDay = parseInt(multiMonthRange[4], 10);
      const endYear = endMonth < startMonth ? year + 1 : year;
      return {
        startDate: formatIso(year, startMonth, startDay),
        endDate: formatIso(endYear, endMonth, endDay),
        isAmbiguous: false,
      };
    }
  }

  // Pattern 3: Single day date, e.g. "October 25, 2026" or "May 10 2027"
  const singleDate = clean.match(/([a-zA-Z]+)\s+(\d{1,2})/);
  if (singleDate) {
    const m = singleDate[1].toLowerCase();
    if (m in MONTHS) {
      const month = MONTHS[m];
      const day = parseInt(singleDate[2], 10);
      const iso = formatIso(year, month, day);
      return { startDate: iso, endDate: iso, isAmbiguous: false };
    }
  }

  // Pattern 4: Month Range without specific days, e.g. "June - July 2027" or "June-July 2027"
  const monthToMonthRange = clean.match(/([a-zA-Z]+)\s*[-–—]\s*([a-zA-Z]+)/);
  if (monthToMonthRange) {
    const m1 = monthToMonthRange[1].toLowerCase();
    const m2 = monthToMonthRange[2].toLowerCase();
    if (m1 in MONTHS && m2 in MONTHS) {
      const startMonth = MONTHS[m1];
      const endMonth = MONTHS[m2];
      const endYear = endMonth < startMonth ? year + 1 : year;
      const lastDay = getDaysInMonth(endYear, endMonth);
      return {
        startDate: formatIso(year, startMonth, 1),
        endDate: formatIso(endYear, endMonth, lastDay),
        isAmbiguous: false,
      };
    }
  }

  // Pattern 5: Month and Year only, e.g. "July 2027" or "July, 2027" or "October 2026"
  const monthOnly = clean.match(/^([a-zA-Z]+)(?:,?\s+\d{4})?$/);
  if (monthOnly) {
    const m = monthOnly[1].toLowerCase();
    if (m in MONTHS) {
      const month = MONTHS[m];
      const lastDay = getDaysInMonth(year, month);
      return {
        startDate: formatIso(year, month, 1),
        endDate: formatIso(year, month, lastDay),
        isAmbiguous: false,
      };
    }
  }

  // Pattern 6: Academic seasons, e.g. "Summer 2027", "Fall 2026", "Spring 2027", "Winter 2027"
  const seasonMatch = clean.match(/\b(summer|fall|autumn|spring|winter)\b/i);
  if (seasonMatch) {
    const season = seasonMatch[1].toLowerCase();
    if (season === 'summer') {
      return { startDate: formatIso(year, 5, 1), endDate: formatIso(year, 7, 31), isAmbiguous: false };
    } else if (season === 'fall' || season === 'autumn') {
      return { startDate: formatIso(year, 8, 1), endDate: formatIso(year, 10, 30), isAmbiguous: false };
    } else if (season === 'spring') {
      return { startDate: formatIso(year, 2, 1), endDate: formatIso(year, 4, 31), isAmbiguous: false };
    } else if (season === 'winter') {
      return { startDate: formatIso(year, 0, 1), endDate: formatIso(year, 1, 28), isAmbiguous: false };
    }
  }

  return { startDate: null, endDate: null, isAmbiguous: true };
}
