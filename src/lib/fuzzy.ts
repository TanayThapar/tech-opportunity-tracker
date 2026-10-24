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
  id?: string;
  title: string;
  organizer: string;
  start_date: string;
  end_date?: string;
  submission_deadline?: string | null;
  conference_tier?: string | null;
  source_url?: string;
  discovery_confidence?: 'high' | 'low';
  confidence_reasons?: string[];
  force_low_confidence?: boolean;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  isAmbiguousNearDuplicate: boolean;
  score: number;
  matchedTitle?: string;
  matchedId?: string;
  matchedCandidate?: MatchCandidate;
  shouldUpdateExisting: boolean;
  betterDataReasons: string[];
  reasons: string[];
}

/**
 * Checks if a candidate offers measurably better data than an existing matched item.
 * Criteria for "better data":
 * 1. Candidate has a specific submission deadline, while existing does not.
 * 2. Candidate has confirmed start/end dates replacing tentative/unparseable ones.
 * 3. Candidate has accredited CORE tier ranking while existing does not.
 * 4. Candidate is evaluated high confidence while existing was low confidence.
 */
export function evaluateBetterData(
  candidate: MatchCandidate,
  existing: MatchCandidate
): { hasBetterData: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // 1. More specific submission deadline
  if (candidate.submission_deadline && !existing.submission_deadline) {
    reasons.push(`More specific submission deadline: ${candidate.submission_deadline}`);
  }

  // 2. Confirmed dates replacing tentative ones
  const existingIsTentative = existing.confidence_reasons?.some(r =>
    r.toLowerCase().includes('tentative') || r.toLowerCase().includes('missing')
  ) || existing.force_low_confidence;

  const candidateIsConfirmed = !candidate.force_low_confidence && candidate.start_date && candidate.end_date;

  if (existingIsTentative && candidateIsConfirmed) {
    reasons.push('Confirmed start/end dates replacing tentative dates');
  }

  // 3. Conference tier enhancement (e.g. Core A* when existing has none)
  if (candidate.conference_tier && (!existing.conference_tier || existing.conference_tier === 'Industry / Non-Academic')) {
    reasons.push(`Accredited conference tier added: ${candidate.conference_tier}`);
  }

  // 4. Higher discovery confidence
  if (candidate.discovery_confidence === 'high' && existing.discovery_confidence === 'low') {
    reasons.push('High-confidence verified metadata replacing low-confidence draft');
  }

  return {
    hasBetterData: reasons.length > 0,
    reasons,
  };
}

/**
 * Checks if candidate is a duplicate of any existing opportunities.
 * Returns strict duplicate match, ambiguous near-duplicate alert, and update signals.
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
      const betterData = evaluateBetterData(candidate, item);
      return {
        isDuplicate: true,
        isAmbiguousNearDuplicate: false,
        score: 1.0,
        matchedTitle: item.title,
        matchedId: item.id,
        matchedCandidate: item,
        shouldUpdateExisting: betterData.hasBetterData,
        betterDataReasons: betterData.reasons,
        reasons: ['Exact source URL match'],
      };
    }

    const titleSim = similarityRatio(candNormTitle, item.title);
    const orgSim = similarityRatio(candNormOrg, item.organizer);
    const closeDate = isCloseDate(candidate.start_date, item.start_date, 4);

    // Weighted similarity calculation: Title is 60%, Organizer is 25%, Date is 15%
    let compositeScore = titleSim * 0.6 + orgSim * 0.25 + (closeDate ? 0.15 : 0);

    // Check for title containment (e.g. "HackMIT 2026" inside "HackMIT 2026: Global Student Hackathon")
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
  // Score >= 0.82 => Definite duplicate (or candidate to update if better data exists)
  // Score between 0.65 and 0.82 => Ambiguous near-duplicate
  if (highestScore >= 0.82 && bestMatch) {
    const betterData = evaluateBetterData(candidate, bestMatch);
    return {
      isDuplicate: true,
      isAmbiguousNearDuplicate: false,
      score: highestScore,
      matchedTitle: bestMatch.title,
      matchedId: bestMatch.id,
      matchedCandidate: bestMatch,
      shouldUpdateExisting: betterData.hasBetterData,
      betterDataReasons: betterData.reasons,
      reasons: [`Strong match (${Math.round(highestScore * 100)}%) with "${bestMatch.title}"`],
    };
  } else if (highestScore >= 0.65 && bestMatch) {
    const betterData = evaluateBetterData(candidate, bestMatch);
    return {
      isDuplicate: false,
      isAmbiguousNearDuplicate: true,
      score: highestScore,
      matchedTitle: bestMatch.title,
      matchedId: bestMatch.id,
      matchedCandidate: bestMatch,
      shouldUpdateExisting: betterData.hasBetterData,
      betterDataReasons: betterData.reasons,
      reasons: [
        `Near-duplicate similarity (${Math.round(highestScore * 100)}%) with existing event "${bestMatch.title}"`,
      ],
    };
  }

  return {
    isDuplicate: false,
    isAmbiguousNearDuplicate: false,
    score: highestScore,
    matchedId: undefined,
    matchedCandidate: undefined,
    shouldUpdateExisting: false,
    betterDataReasons: [],
    reasons: [],
  };
}
