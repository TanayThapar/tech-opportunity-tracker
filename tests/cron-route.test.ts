import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { _resetMemoryStoreForTests } from '@/lib/store';

// Mock runDiscoveryPipeline to isolate route handler authorization testing from external network requests
vi.mock('@/lib/pipeline', () => ({
  runDiscoveryPipeline: vi.fn(async (options: any = {}) => ({
    log: {
      id: 'run-mock-123',
      timestamp: new Date().toISOString(),
      status: 'success',
      events_scanned: options.customCandidates?.length || 5,
      events_added: 2,
      duplicates_skipped: 1,
      events_archived: 0,
      low_confidence_count: 0,
      errors: [],
    },
    newOpportunities: options.customCandidates ? options.customCandidates : [],
    updatedOpportunities: [],
  })),
}));

import { GET, POST } from '@/app/api/pipeline/run/route';
import { runDiscoveryPipeline } from '@/lib/pipeline';

describe('Cron Pipeline Route Authorization & Security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    _resetMemoryStoreForTests();
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('fails closed when CRON_SECRET is unset or empty (returns 401 for both GET and POST)', async () => {
    delete process.env.CRON_SECRET;

    const getReq = new Request('http://localhost:3000/api/pipeline/run', {
      method: 'GET',
      headers: { authorization: 'Bearer some_secret' },
    });
    const getRes = await GET(getReq);
    expect(getRes.status).toBe(401);

    const postReq = new Request('http://localhost:3000/api/pipeline/run', {
      method: 'POST',
      headers: { authorization: 'Bearer some_secret' },
    });
    const postRes = await POST(postReq);
    expect(postRes.status).toBe(401);
  });

  it('returns 401 when request provides an incorrect cron secret', async () => {
    process.env.CRON_SECRET = 'super_secure_cron_token_12345';

    const req = new Request('http://localhost:3000/api/pipeline/run', {
      method: 'GET',
      headers: { authorization: 'Bearer wrong_token' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('authorizes successfully with valid Bearer CRON_SECRET on GET', async () => {
    process.env.CRON_SECRET = 'valid_secret_xyz_789';

    const req = new Request('http://localhost:3000/api/pipeline/run', {
      method: 'GET',
      headers: { authorization: 'Bearer valid_secret_xyz_789' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.log).toBeDefined();
    expect(runDiscoveryPipeline).toHaveBeenCalledWith();
  });

  it('ignores custom candidates in request body during a cron call', async () => {
    process.env.CRON_SECRET = 'valid_secret_xyz_789';

    // A cron call passing candidates in body should NOT pass customCandidates to the pipeline
    const postReq = new Request('http://localhost:3000/api/pipeline/run', {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid_secret_xyz_789',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        candidates: [
          {
            title: 'Sneaky Injected Event',
            type: 'hackathon',
            organizer: 'Malicious Actor',
            start_date: '2027-01-01',
            end_date: '2027-01-02',
            source_url: 'https://example.com/sneaky',
            description: 'Should be ignored during cron run',
          },
        ],
      }),
    });

    const res = await POST(postReq);
    expect(res.status).toBe(200);

    // Verify runDiscoveryPipeline was called with customCandidates undefined
    expect(runDiscoveryPipeline).toHaveBeenCalledWith({
      customCandidates: undefined,
      triggeredByAdmin: false,
    });
  });
});
