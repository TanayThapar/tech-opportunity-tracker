import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isDemoMode, login } from '@/lib/auth';
import { POST as runPipelinePOST } from '@/app/api/pipeline/run/route';
import { GET as getLogsGET } from '@/app/api/pipeline/logs/route';
import { POST as updateRolePOST } from '@/app/api/admin/roles/route';
import { PATCH as updateOppPATCH } from '@/app/api/opportunities/route';
import { _resetMemoryStoreForTests, saveProfile, saveOpportunities } from '@/lib/store';

describe('Demo Mode & Role Escalation Isolation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    _resetMemoryStoreForTests();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('ensures demo mode is NEVER active when NODE_ENV=production', () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';

    expect(isDemoMode()).toBe(false);
  });

  it('ensures demo mode only grants user role and never admin or moderator', () => {
    (process.env as any).NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';

    const loginRes = login('TanayThapar');
    expect(loginRes.success).toBe(true);
    expect(loginRes.user?.role).toBe('user'); // MUST BE 'user', NEVER 'admin'!
  });

  it('blocks standard user from accessing admin pipeline logs route (403 Forbidden)', async () => {
    const standardUser = await saveProfile({
      id: 'usr_standard_1',
      email: 'regular@example.com',
      name: 'Regular Hacker',
      handle: 'reghacker',
      role: 'user',
      createdAt: '2026-10-24',
    });

    const req = new Request('http://localhost:3000/api/pipeline/logs', {
      headers: {
        'x-user-id': standardUser.id,
        'x-user-email': standardUser.email,
      },
    });

    const res = await getLogsGET(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Forbidden');
  });

  it('blocks standard user from manually triggering pipeline runs', async () => {
    delete process.env.CRON_SECRET;

    const standardUser = await saveProfile({
      id: 'usr_standard_2',
      email: 'regular2@example.com',
      name: 'Regular 2',
      handle: 'reg2',
      role: 'user',
      createdAt: '2026-10-24',
    });

    const req = new Request('http://localhost:3000/api/pipeline/run', {
      method: 'POST',
      headers: {
        'x-user-id': standardUser.id,
      },
    });

    const res = await runPipelinePOST(req);
    expect(res.status).toBe(401);
  });

  it('prevents moderator from modifying roles or escalating to admin', async () => {
    const modUser = await saveProfile({
      id: 'usr_mod_1',
      email: 'mod@example.com',
      name: 'Moderator Alex',
      handle: 'mod_alex',
      role: 'moderator',
      createdAt: '2026-10-24',
    });

    const req = new Request('http://localhost:3000/api/admin/roles', {
      method: 'POST',
      headers: {
        'x-user-id': modUser.id,
        'x-user-email': modUser.email,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        targetUserId: modUser.id,
        newRole: 'admin',
      }),
    });

    const res = await updateRolePOST(req);
    expect(res.status).toBe(403); // Only admin can update roles
  });

  it('rejects role escalation attempts embedded inside opportunity update request body', async () => {
    const modUser = await saveProfile({
      id: 'usr_mod_2',
      email: 'mod2@example.com',
      name: 'Mod 2',
      handle: 'mod2',
      role: 'moderator',
      createdAt: '2026-10-24',
    });

    await saveOpportunities([
      {
        id: 'opp-1',
        title: 'Sample Event',
        type: 'conference',
        organizer: 'Sample',
        start_date: '2026-12-01',
        end_date: '2026-12-05',
        format: 'online',
        source_url: 'https://example.com',
        description: 'Test event',
        discovery_confidence: 'high',
        status: 'published',
        created_at: '2026-10-24',
        updated_at: '2026-10-24',
      },
    ]);

    const req = new Request('http://localhost:3000/api/opportunities', {
      method: 'PATCH',
      headers: {
        'x-user-id': modUser.id,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        id: 'opp-1',
        role: 'admin', // Injected role claim
      }),
    });

    const res = await updateOppPATCH(req);
    expect(res.status).toBe(200);

    // Verify moderator role was not modified
    expect(modUser.role).toBe('moderator');
  });
});
