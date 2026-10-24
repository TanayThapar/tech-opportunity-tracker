import { describe, it, expect, beforeEach } from 'vitest';
import { runDiscoveryPipeline } from '@/lib/pipeline';
import { _resetMemoryStoreForTests, getOpportunities } from '@/lib/store';
import { RawDiscoveredItem } from '@/lib/sources';

describe('Malformed Adapter Data Quarantine & Safety', () => {
  beforeEach(() => {
    _resetMemoryStoreForTests();
  });

  it('quarantines records with missing dates to needs_review and never auto-publishes them', async () => {
    const malformedItem: RawDiscoveredItem = {
      title: 'Conference With Missing Dates 2027',
      type: 'conference',
      organizer: 'Test Org',
      start_date: '', // Missing
      end_date: '',   // Missing
      format: 'online',
      source_url: 'https://example.com/conf',
      description: 'Conference details with unparseable dates.',
      confidence_reasons: [],
      force_low_confidence: true,
      origin: 'adapter',
    };

    const result = await runDiscoveryPipeline({
      customCandidates: [malformedItem],
    });

    expect(result.log.status).toBe('success');
    expect(result.newOpportunities.length).toBe(1);

    const created = result.newOpportunities[0];
    expect(created.discovery_confidence).toBe('low');
    expect(created.status).toBe('needs_review'); // NEVER published
    expect(created.status).not.toBe('published');

    // Confirm that public query (status: published) does NOT return this item
    const all = await getOpportunities({ status: 'published' });
    expect(all.find(o => o.id === created.id)).toBeUndefined();
  });

  it('quarantines records with invalid/unreachable URLs to needs_review', async () => {
    const badUrlItem: RawDiscoveredItem = {
      title: 'Hackathon With Broken URL 2027',
      type: 'hackathon',
      organizer: 'Test Org',
      start_date: '2027-05-10',
      end_date: '2027-05-12',
      format: 'online',
      source_url: 'http://not-a-valid-domain-xyz-404-unreachable.invalid',
      description: 'A hackathon whose URL fails liveness probe.',
      confidence_reasons: [],
      origin: 'adapter',
    };

    const result = await runDiscoveryPipeline({
      customCandidates: [badUrlItem],
    });

    expect(result.newOpportunities.length).toBe(1);
    const created = result.newOpportunities[0];
    expect(created.discovery_confidence).toBe('low');
    expect(created.status).toBe('needs_review'); // Held back
    expect(created.confidence_reasons?.some(r => r.includes('unreachable'))).toBe(true);
  });

  it('isolates malformed and partial records without crashing the run', async () => {
    const partialItems: any[] = [
      {
        title: 'Partial Event 1',
        type: 'invalid_type',
        source_url: 'not-even-a-url',
        start_date: 'invalid-date',
        end_date: 'invalid-date',
      },
      {
        title: 'Valid Conference 2027',
        type: 'conference',
        organizer: 'Valid Society',
        start_date: '2027-09-01',
        end_date: '2027-09-03',
        submission_deadline: '2027-04-01T23:59:59.000Z',
        format: 'in-person',
        source_url: 'https://example.com/valid',
        link_status: 'ok',
        description: 'Valid conference with complete data.',
        confidence_reasons: ['dates from community-maintained dataset, not re-confirmed against organizer site'],
        origin: 'adapter',
      },
    ];

    const result = await runDiscoveryPipeline({
      customCandidates: partialItems,
    });

    // Run must complete successfully and process all valid candidates
    expect(result.log.status).toBe('success');
    expect(result.newOpportunities.length).toBe(2);

    const validOne = result.newOpportunities.find(o => o.title === 'Valid Conference 2027');
    expect(validOne).toBeDefined();

    const partialOne = result.newOpportunities.find(o => o.title === 'Partial Event 1');
    expect(partialOne).toBeDefined();
    expect(partialOne?.status).toBe('needs_review');
  });
});
