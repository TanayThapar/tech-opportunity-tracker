import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRefreshIntervalHours,
  setRefreshIntervalHours,
  getRefreshStatus,
  recordPipelineRunTime,
  shouldAutoRefresh,
} from '@/lib/refreshScheduler';
import { GET as scheduleGET, POST as schedulePOST } from '@/app/api/pipeline/schedule/route';
import { createSessionToken } from '@/lib/serverAuth';
import { _resetMemoryStoreForTests, saveProfile, getOpportunities } from '@/lib/store';

describe('Scraper Refresh Interval & Periodic Scheduling', () => {
  beforeEach(() => {
    _resetMemoryStoreForTests();
    setRefreshIntervalHours(6);
  });

  it('manages configurable refresh intervals within permitted boundaries', () => {
    expect(getRefreshIntervalHours()).toBe(6);

    setRefreshIntervalHours(12);
    expect(getRefreshIntervalHours()).toBe(12);

    // Invalid values are rejected
    setRefreshIntervalHours(0);
    expect(getRefreshIntervalHours()).toBe(12);

    setRefreshIntervalHours(100);
    expect(getRefreshIntervalHours()).toBe(12);
  });

  it('accurately computes next run timestamp and stale status', () => {
    const testTime = Date.now() - 7 * 60 * 60 * 1000; // 7 hours ago
    recordPipelineRunTime(testTime);

    const status = getRefreshStatus();
    expect(status.intervalHours).toBe(6);
    expect(status.isStale).toBe(true); // 7h elapsed > 6h interval
    expect(shouldAutoRefresh()).toBe(true);

    // Fresh run
    recordPipelineRunTime(Date.now());
    const freshStatus = getRefreshStatus();
    expect(freshStatus.isStale).toBe(false);
    expect(shouldAutoRefresh()).toBe(false);
  });

  it('GET /api/pipeline/schedule returns current schedule metadata', async () => {
    const res = await scheduleGET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.intervalHours).toBe(6);
  });

  it('POST /api/pipeline/schedule allows admin to adjust interval and rejects unauthorized callers', async () => {
    const unauthReq = new Request('http://localhost:3000/api/pipeline/schedule', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intervalHours: 12 }),
    });
    const unauthRes = await schedulePOST(unauthReq);
    expect(unauthRes.status).toBe(403);

    // Admin caller
    const admin = await saveProfile({
      id: 'usr-admin-refresh',
      email: 'admin@refresh.test',
      name: 'Admin',
      handle: 'admin_refresh',
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
    const token = createSessionToken({
      userId: admin.id,
      email: admin.email,
      handle: admin.handle,
      role: 'admin',
    });

    const authReq = new Request('http://localhost:3000/api/pipeline/schedule', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ intervalHours: 12 }),
    });

    const authRes = await schedulePOST(authReq);
    expect(authRes.status).toBe(200);
    const json = await authRes.json();
    expect(json.success).toBe(true);
    expect(json.data.intervalHours).toBe(12);
  });

  it('filters opportunities accurately by subfield', async () => {
    const aiConf = await getOpportunities({ subfield: 'AI / Machine Learning' });
    expect(aiConf.every(c => c.subfield === 'AI / Machine Learning')).toBe(true);

    const sysConf = await getOpportunities({ subfield: 'Systems & Architecture' });
    expect(sysConf.every(c => c.subfield === 'Systems & Architecture')).toBe(true);
  });
});
