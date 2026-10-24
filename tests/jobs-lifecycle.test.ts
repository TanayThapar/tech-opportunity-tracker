import { describe, it, expect, beforeEach } from 'vitest';
import { runDiscoveryPipeline } from '@/lib/pipeline';
import {
  _resetMemoryStoreForTests,
  saveOpportunities,
  getOpportunities,
} from '@/lib/store';
import { TechOpportunity } from '@/types';
import { RawDiscoveredItem } from '@/lib/sources';

describe('Job Opportunity Lifecycle & Closure Rules', () => {
  beforeEach(() => {
    _resetMemoryStoreForTests();
  });

  it('accepts a job with no application deadline as valid ("no deadline listed")', async () => {
    const jobItem: RawDiscoveredItem = {
      title: 'JPMorganChase: Software Engineer Full Time Analyst',
      type: 'job',
      organizer: 'JPMorganChase',
      company: 'JPMorganChase',
      start_date: '2026-09-01',
      end_date: '2027-06-30',
      submission_deadline: null,
      application_deadline: null, // No deadline listed
      format: 'hybrid',
      location: 'New York, NY',
      source_url: 'https://example.com/jpmc-swe',
      description: 'Distributed enterprise financial systems role.',
      confidence_reasons: ['no application deadline listed (rolling evaluation)'],
      origin: 'adapter',
    };

    const result = await runDiscoveryPipeline({
      customCandidates: [jobItem],
    });

    expect(result.newOpportunities.length).toBe(1);
    const saved = result.newOpportunities[0];
    expect(saved.application_deadline).toBeNull();
    expect(saved.confidence_reasons?.some(r => r.includes('no application deadline listed'))).toBe(true);
  });

  it('does NOT archive a job on transient network errors / timeouts', async () => {
    const activeJob: TechOpportunity = {
      id: 'opp-job-transient',
      title: 'Samsung Electronics: Systems Engineer',
      type: 'job',
      company: 'Samsung Electronics',
      organizer: 'Samsung Electronics',
      start_date: '2026-08-01',
      end_date: '2026-10-01', // Placeholder end date that has passed
      application_deadline: null, // But rolling evaluation (no explicit deadline!)
      format: 'in-person',
      source_url: 'https://example.com/samsung-systems',
      description: 'On-device systems role.',
      discovery_confidence: 'high',
      status: 'published',
      link_status: 'unreachable', // Transient timeout failure
      listing_status: 'open',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    };

    await saveOpportunities([activeJob]);

    // Run pipeline with customCandidates: [] to test existing DB opportunity expiration logic
    const result = await runDiscoveryPipeline({ customCandidates: [] });

    // Verify that the job was NOT archived due to transient end date
    const all = await getOpportunities({ status: 'published' });
    const retrieved = all.find(o => o.id === activeJob.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.status).toBe('published');
  });

  it('archives a job ONLY on explicit closure evidence (stated deadline has passed or marked closed/expired)', async () => {
    const closedJob: TechOpportunity = {
      id: 'opp-job-closed',
      title: 'Tech Corp: Senior Platform Engineer',
      type: 'job',
      company: 'Tech Corp',
      organizer: 'Tech Corp',
      start_date: '2026-01-01',
      end_date: '2026-05-01',
      application_deadline: '2026-05-01', // Explicit stated deadline that has passed
      format: 'online',
      source_url: 'https://example.com/closed-job',
      description: 'Platform engineer position with closed deadline.',
      discovery_confidence: 'high',
      status: 'published',
      listing_status: 'open',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    await saveOpportunities([closedJob]);

    const result = await runDiscoveryPipeline({ customCandidates: [] });

    // The job with an explicitly expired application deadline MUST be archived
    expect(result.log.events_archived).toBeGreaterThanOrEqual(1);

    const all = await getOpportunities();
    const archived = all.find(o => o.id === closedJob.id);
    expect(archived?.status).toBe('archived');
  });
});
