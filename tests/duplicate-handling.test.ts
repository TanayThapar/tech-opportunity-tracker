import { describe, it, expect, beforeEach } from 'vitest';
import { runDiscoveryPipeline } from '@/lib/pipeline';
import {
  _resetMemoryStoreForTests,
  saveOpportunities,
  getOpportunities,
} from '@/lib/store';
import { TechOpportunity } from '@/types';
import { RawDiscoveredItem } from '@/lib/sources';

describe('Duplicate Handling & Progressive Data Updates', () => {
  beforeEach(() => {
    _resetMemoryStoreForTests();
  });

  it('updates an existing record when a near-duplicate arrives with better data (e.g. specific deadline replacing missing deadline)', async () => {
    const existingTentative: TechOpportunity = {
      id: 'opp-sigmod-2027',
      title: 'SIGMOD 2027: ACM Conference on Management of Data',
      type: 'conference',
      conference_tier: 'Core A*',
      organizer: 'ACM SIGMOD',
      start_date: '2027-06-13',
      end_date: '2027-06-19',
      submission_deadline: null, // No deadline listed yet
      format: 'in-person',
      source_url: 'https://2027.sigmod.org/',
      description: 'ACM SIGMOD 2027',
      discovery_confidence: 'low',
      confidence_reasons: ['dates from community-maintained dataset, not re-confirmed against organizer site'],
      status: 'needs_review',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    };

    await saveOpportunities([existingTentative]);

    // Near-duplicate arrives with confirmed submission deadline
    const enhancedCandidate: RawDiscoveredItem = {
      title: 'SIGMOD 2027: ACM Conference on Management of Data',
      type: 'conference',
      conference_tier: 'Core A*',
      organizer: 'ACM SIGMOD',
      start_date: '2027-06-13',
      end_date: '2027-06-19',
      submission_deadline: '2026-10-17T23:59:59.000Z', // Specific deadline!
      format: 'in-person',
      source_url: 'https://2027.sigmod.org/',
      link_status: 'ok',
      description: 'ACM SIGMOD 2027 with round 4 deadline announced',
      confidence_reasons: ['dates from community-maintained dataset, not re-confirmed against organizer site'],
      origin: 'adapter',
    };

    const result = await runDiscoveryPipeline({
      customCandidates: [enhancedCandidate],
    });

    // Should update existing record rather than insert a redundant duplicate
    expect(result.updatedOpportunities.length).toBe(1);
    expect(result.newOpportunities.length).toBe(0);

    const updated = (await getOpportunities()).find(o => o.id === existingTentative.id);
    expect(updated?.submission_deadline).toBe('2026-10-17T23:59:59.000Z');
  });

  it('adds nothing on identical re-run (idempotency: duplicates_skipped incremented, 0 added)', async () => {
    const existing: TechOpportunity = {
      id: 'opp-icse-2027',
      title: 'ICSE 2027: International Conference on Software Engineering',
      type: 'conference',
      conference_tier: 'Core A*',
      organizer: 'IEEE / ACM SIGSOFT',
      start_date: '2027-04-24',
      end_date: '2027-05-02',
      submission_deadline: '2026-10-02T23:59:59.000Z',
      format: 'in-person',
      source_url: 'https://conf.researchr.org/home/icse-2027',
      link_status: 'ok',
      description: 'Software engineering conference',
      discovery_confidence: 'high',
      status: 'published',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    };

    await saveOpportunities([existing]);

    // Identical candidate arrives
    const identicalCandidate: RawDiscoveredItem = {
      title: 'ICSE 2027: International Conference on Software Engineering',
      type: 'conference',
      conference_tier: 'Core A*',
      organizer: 'IEEE / ACM SIGSOFT',
      start_date: '2027-04-24',
      end_date: '2027-05-02',
      submission_deadline: '2026-10-02T23:59:59.000Z',
      format: 'in-person',
      source_url: 'https://conf.researchr.org/home/icse-2027',
      link_status: 'ok',
      description: 'Software engineering conference',
      confidence_reasons: ['dates from community-maintained dataset, not re-confirmed against organizer site'],
      origin: 'adapter',
    };

    const result = await runDiscoveryPipeline({
      customCandidates: [identicalCandidate],
    });

    expect(result.newOpportunities.length).toBe(0);
    expect(result.updatedOpportunities.length).toBe(0);
    expect(result.log.duplicates_skipped).toBe(1);
    expect(result.log.events_added).toBe(0);
  });
});
