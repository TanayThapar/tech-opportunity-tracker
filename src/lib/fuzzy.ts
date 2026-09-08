import levenshtein from 'fast-levenshtein';

/**
 * Normalizes text for comparison by lowercasing, stripping special characters,
 * and collapsing extra whitespaces.
 */
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Levenshtein similarity ratio between two strings [0.0 - 1.0]
 */
export function similarityRatio(a: string, b: string): number {
  const normA = normalizeString(a);
  const normB = normalizeString(b);
  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshtein.get(normA, normB);
  return 1.0 - dist / maxLen;
}

/**
 * Checks if two dates are close (within N days of each other)
 */
export function isCloseDate(dateAStr: string, dateBStr: string, toleranceDays = 7): boolean {
  try {
    const da = new Date(dateAStr).getTime();
    const db = new Date(dateBStr).getTime();
    if (isNaN(da) || isNaN(db)) return false;
    const diffMs = Math.abs(da - db);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= toleranceDays;
  } catch {
    return false;
  }
}

export interface MatchCandidate {
  title: string;
  organizer: string;
  start_date: string;
  source_url?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  isAmbiguousNearDuplicate: boolean;
  score: number;
  matchedTitle?: string;
  reasons: string[];
}

/**
 * Checks if candidate is a duplicate of any existing opportunities.
 * Returns both strict duplicate match and ambiguous near-duplicate alert.
 */
export function evaluateDuplicate(
  candidate: MatchCandidate,
  existingList: MatchCandidate[]
): DuplicateCheckResult {
  let highestScore = 0;
  let bestMatch: MatchCandidate | null = null;
  const reasons: string[] = [];

  const candNormTitle = normalizeString(candidate.title);
  const candNormOrg = normalizeString(candidate.organizer);

  for (const item of existingList) {
    // 1. Direct URL match
    if (
      candidate.source_url &&
      item.source_url &&
      candidate.source_url.trim().toLowerCase() === item.source_url.trim().toLowerCase()
    ) {
      return {
        isDuplicate: true,
        isAmbiguousNearDuplicate: false,
        score: 1.0,
        matchedTitle: item.title,
        reasons: ['Exact source URL match'],
      };
    }

    const titleSim = similarityRatio(candNormTitle, item.title);
    const orgSim = similarityRatio(candNormOrg, item.organizer);
    const closeDate = isCloseDate(candidate.start_date, item.start_date, 4);

    // Weighted similarity calculation
    // Title is 60%, Organizer is 25%, Date is 15%
    let compositeScore = titleSim * 0.6 + orgSim * 0.25 + (closeDate ? 0.15 : 0);

    // Check for exact containment (e.g. "HackMIT 2026" inside "HackMIT 2026: Global Student Hackathon")
    const itemNormTitle = normalizeString(item.title);
    if (
      (candNormTitle.includes(itemNormTitle) || itemNormTitle.includes(candNormTitle)) &&
      candNormTitle.length > 5 &&
      itemNormTitle.length > 5
    ) {
      compositeScore = Math.max(compositeScore, 0.85);
    }

    if (compositeScore > highestScore) {
      highestScore = compositeScore;
      bestMatch = item;
    }
  }

  // Thresholds:
  // Score >= 0.82 => Definite duplicate (skip)
  // Score between 0.65 and 0.82 => Ambiguous near-duplicate (flag as low confidence, don't silently drop)
  if (highestScore >= 0.82) {
    return {
      isDuplicate: true,
      isAmbiguousNearDuplicate: false,
      score: highestScore,
      matchedTitle: bestMatch?.title,
      reasons: [`Strong match (${Math.round(highestScore * 100)}%) with "${bestMatch?.title}"`],
    };
  } else if (highestScore >= 0.65) {
    return {
      isDuplicate: false,
      isAmbiguousNearDuplicate: true,
      score: highestScore,
      matchedTitle: bestMatch?.title,
      reasons: [
        `Near-duplicate similarity (${Math.round(highestScore * 100)}%) with existing event "${bestMatch?.title}"`,
      ],
    };
  }

  return {
    isDuplicate: false,
    isAmbiguousNearDuplicate: false,
    score: highestScore,
    reasons: [],
  };
}
