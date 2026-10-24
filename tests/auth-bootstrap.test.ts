import { describe, it, expect, beforeEach } from 'vitest';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { GET as meGET } from '@/app/api/auth/me/route';
import { _resetMemoryStoreForTests } from '@/lib/store';
import { isBootstrapAdmin } from '@/lib/serverAuth';

describe('Bootstrap Admin Authentication & Single-Scheme RBAC', () => {
  beforeEach(() => {
    _resetMemoryStoreForTests();
  });

  it('correctly detects bootstrap admin identifiers', () => {
    expect(isBootstrapAdmin('@TanayThapar')).toBe(true);
    expect(isBootstrapAdmin('TanayThapar')).toBe(true);
    expect(isBootstrapAdmin('tanaythapar')).toBe(true);
    expect(isBootstrapAdmin('tanay.ggmu@gmail.com')).toBe(true);
    expect(isBootstrapAdmin('Sanvi850')).toBe(true);
    expect(isBootstrapAdmin('@Sanvi850')).toBe(true);
    expect(isBootstrapAdmin('panchadip125')).toBe(true);
    expect(isBootstrapAdmin('unknown_user')).toBe(false);
  });

  it('assigns role "admin" to @TanayThapar upon login', async () => {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '@TanayThapar' }),
    });

    const res = await loginPOST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.handle.toLowerCase()).toBe('tanaythapar');
    expect(data.user.role).toBe('admin');
    expect(data.token).toBeDefined();
  });

  it('assigns role "user" to a non-admin account upon login', async () => {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'regular_student_2026' }),
    });

    const res = await loginPOST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.user.role).toBe('user');
    expect(data.token).toBeDefined();
  });

  it('verifies admin session via GET /api/auth/me with bearer token', async () => {
    // First login TanayThapar
    const loginReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'TanayThapar' }),
    });
    const loginRes = await loginPOST(loginReq);
    const loginData = await loginRes.json();
    expect(loginData.token).toBeDefined();

    // Query /api/auth/me with verified session token
    const meReq = new Request('http://localhost:3000/api/auth/me', {
      headers: {
        authorization: `Bearer ${loginData.token}`,
      },
    });

    const meRes = await meGET(meReq);
    const meData = await meRes.json();

    expect(meData.success).toBe(true);
    expect(meData.user.role).toBe('admin');
  });

  it('rejects forged identity headers without valid session token', async () => {
    const forgedReq = new Request('http://localhost:3000/api/auth/me', {
      headers: {
        'x-user-id': 'usr-tanaythapar',
        'x-user-handle': 'TanayThapar',
        'x-user-role': 'admin',
      },
    });

    const res = await meGET(forgedReq);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});
