/**
 * Society & Organizer Utilities
 * 
 * Provides robust identification and filtering for major technical societies:
 * - ACM (Association for Computing Machinery and SIGs)
 * - IEEE (Institute of Electrical and Electronics Engineers and societies)
 * - USENIX (Advanced Computing Systems Association)
 */

import { TechOpportunity } from '@/types';

export type SocietyFilter = 'all' | 'acm' | 'ieee' | 'usenix' | 'other' | 'acm_ieee';

export type RecognizedSociety = 'ACM' | 'IEEE' | 'USENIX';

const ACM_PATTERNS = [
  /\bACM\b/i,
  /\bAssociation for Computing Machinery\b/i,
  /\bSIGCOMM\b/i,
  /\bSIGMOD\b/i,
  /\bSIGOPS\b/i,
  /\bSIGPLAN\b/i,
  /\bSIGGRAPH\b/i,
  /\bSIGCHI\b/i,
  /\bSIGKDD\b/i,
  /\bSIGACT\b/i,
  /\bSIGMOBILE\b/i,
  /\bSIGBED\b/i,
  /\bSIGIR\b/i,
  /\bSIGWEB\b/i,
  /\bSIGSAC\b/i,
  /\bSIGSOFT\b/i,
  /\bSIGMM\b/i,
  /\bacm\.org\b/i,
];

const IEEE_PATTERNS = [
  /\bIEEE\b/i,
  /\bInstitute of Electrical and Electronics Engineers\b/i,
  /\bieee\.org\b/i,
  /\bthecvf\.com\b/i,
];

const USENIX_PATTERNS = [
  /\bUSENIX\b/i,
  /\busenix\.org\b/i,
];

/**
 * Detects which professional societies sponsor or host this opportunity.
 */
export function detectSocieties(item: {
  title: string;
  organizer: string;
  description?: string;
  source_url?: string;
}): RecognizedSociety[] {
  const haystack = `${item.title} ${item.organizer} ${item.description || ''} ${item.source_url || ''}`;
  const found: RecognizedSociety[] = [];

  if (ACM_PATTERNS.some(pattern => pattern.test(haystack))) {
    found.push('ACM');
  }

  if (IEEE_PATTERNS.some(pattern => pattern.test(haystack))) {
    found.push('IEEE');
  }

  if (USENIX_PATTERNS.some(pattern => pattern.test(haystack))) {
    found.push('USENIX');
  }

  return found;
}

/**
 * Checks whether an opportunity satisfies the active society filter.
 */
export function matchesSociety(
  item: TechOpportunity,
  filter: SocietyFilter
): boolean {
  if (filter === 'all') return true;

  const societies = detectSocieties(item);

  if (filter === 'acm') {
    return societies.includes('ACM');
  }

  if (filter === 'ieee') {
    return societies.includes('IEEE');
  }

  if (filter === 'acm_ieee') {
    return societies.includes('ACM') || societies.includes('IEEE');
  }

  if (filter === 'usenix') {
    return societies.includes('USENIX');
  }

  if (filter === 'other') {
    return societies.length === 0;
  }

  return true;
}

/**
 * Calculates counts of opportunities per professional society.
 */
export function getSocietyStats(opportunities: TechOpportunity[]): {
  acm: number;
  ieee: number;
  usenix: number;
} {
  let acm = 0;
  let ieee = 0;
  let usenix = 0;

  for (const opp of opportunities) {
    const societies = detectSocieties(opp);
    if (societies.includes('ACM')) acm++;
    if (societies.includes('IEEE')) ieee++;
    if (societies.includes('USENIX')) usenix++;
  }

  return { acm, ieee, usenix };
}
