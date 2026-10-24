import { describe, it, expect, beforeEach } from 'vitest';
import { _resetMemoryStoreForTests, saveProfile } from '@/lib/store';
import { createSessionToken, getAuthenticatedUser, verifySessionToken } from '@/lib/serverAuth';
import { GET as meGET } from '@/app/api/auth/me/route';
import { POST as rolesPOST } from '@/app/api/admin/roles/route';
import { GET as interactionsGET, POST as interactionsPOST } from '@/app/api/user/interactions/route';
import { GET as updatesGET, PATCH as updatesPATCH } from '@/app/api/user/updates/route';
import { GET as preferencesGET, PUT as preferencesPUT } from '@/app/api/user/preferences/route';
import { GET as logsGET } from '@/app/api/pipeline/logs/route';
import { POST as runPOST } from '@/app/api/pipeline/run/route';

describe('Comprehensive Authentication & Authorization Security', () => {
  beforeEach(() => {
    _resetMemoryStoreForTests();
  });

  describe('1. Caller-Supplied Header Forgery Immunity', () => {
    it('completely ignores spoofed x-user-id, x-user-handle, and x-user-role headers', async () => {
      const spoofedReq = new Request('http://localhost:3000/api/auth/me', {
        headers: {
          'x-user-id': 'usr-admin-tanay',
          'x-user-handle': 'TanayThapar',
          'x-user-email': 'tanaythapar@example.com',
          'x-user-role': 'admin',
        },
      });

      const res = await meGET(spoofedReq);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.user).toBeNull();
    });

    it('getAuthenticatedUser returns null when only unverified headers are provided', async () => {
      const spoofedReq = new Request('http://localhost:3000/api/opportunities', {
        headers: {
          'x-user-id': 'usr-admin',
          'x-user-handle': 'admin',
        },
      });

      const user = await getAuthenticatedUser(spoofedReq);
      expect(user).toBeNull();
    });
  });

  describe('2. Cryptographic Token Tampering & Expiration Defense', () => {
    it('rejects tokens with forged or tampered signatures', () => {
      const validToken = createSessionToken({
        userId: 'usr-legit',
        email: 'legit@example.com',
        handle: 'legit',
        role: 'user',
      });

      const [header, payload, sig] = validToken.split('.');
      // Tamper signature
      const tamperedSig = sig.slice(0, -4) + 'abcd';
      const tamperedToken = `${header}.${payload}.${tamperedSig}`;

      const res = verifySessionToken(tamperedToken);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('signature');
    });

    it('rejects tokens where payload was modified after signing', () => {
      const validToken = createSessionToken({
        userId: 'usr-legit',
        email: 'legit@example.com',
        handle: 'legit',
        role: 'user',
      });

      const [header, payloadB64, sig] = validToken.split('.');
      // Attempt to tamper role in payload to 'admin'
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
      payload.role = 'admin';
      const modifiedPayloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tamperedToken = `${header}.${modifiedPayloadB64}.${sig}`;

      const res = verifySessionToken(tamperedToken);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('signature');
    });

    it('rejects expired session tokens', () => {
      // Create token that expired 10 seconds ago
      const expiredToken = createSessionToken(
        {
          userId: 'usr-expired',
          email: 'expired@example.com',
          handle: 'expired',
          role: 'user',
        },
        -10
      );

      const res = verifySessionToken(expiredToken);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('expired');
    });
  });

  describe('3. Role Escalation Prevention', () => {
    it('prevents regular user from calling admin roles route', async () => {
      const user = await saveProfile({
        id: 'usr-attacker',
        email: 'attacker@example.com',
        name: 'Attacker',
        handle: 'attacker',
        role: 'user',
        createdAt: new Date().toISOString(),
      });

      const token = createSessionToken({
        userId: user.id,
        email: user.email,
        handle: user.handle,
        role: user.role,
      });

      const req = new Request('http://localhost:3000/api/admin/roles', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: user.id,
          newRole: 'admin',
        }),
      });

      const res = await rolesPOST(req);
      expect(res.status).toBe(403);
    });

    it('protects immutable root administrators (TanayThapar & Sanvi850) against role modification or demotion', async () => {
      const rootUser = await saveProfile({
        id: 'usr-tanay',
        email: 'tanay@example.com',
        name: 'Tanay Thapar',
        handle: 'TanayThapar',
        role: 'admin',
        createdAt: new Date().toISOString(),
      });

      const anotherAdmin = await saveProfile({
        id: 'usr-admin-2',
        email: 'otheradmin@example.com',
        name: 'Other Admin',
        handle: 'OtherAdmin',
        role: 'admin',
        createdAt: new Date().toISOString(),
      });

      const adminToken = createSessionToken({
        userId: anotherAdmin.id,
        email: anotherAdmin.email,
        handle: anotherAdmin.handle,
        role: 'admin',
      });

      // Attempt to demote root admin TanayThapar to 'user'
      const demoteReq = new Request('http://localhost:3000/api/admin/roles', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: rootUser.id,
          newRole: 'user',
        }),
      });

      const res = await rolesPOST(demoteReq);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('highest level of administrative access locked in source code');
    });

    it('prevents unauthenticated caller from accessing pipeline audit logs', async () => {
      const req = new Request('http://localhost:3000/api/pipeline/logs');
      const res = await logsGET(req);
      expect(res.status).toBe(401);
    });
  });

  describe('4. Cross-User Isolation in Personal Feature Endpoints', () => {
    it('isolates user interactions strictly by authenticated session identity', async () => {
      const userA = await saveProfile({
        id: 'usr-a',
        email: 'a@example.com',
        name: 'Alice',
        handle: 'alice',
        role: 'user',
        createdAt: new Date().toISOString(),
      });

      const userB = await saveProfile({
        id: 'usr-b',
        email: 'b@example.com',
        name: 'Bob',
        handle: 'bob',
        role: 'user',
        createdAt: new Date().toISOString(),
      });

      const tokenA = createSessionToken({
        userId: userA.id,
        email: userA.email,
        handle: userA.handle,
        role: userA.role,
      });

      const tokenB = createSessionToken({
        userId: userB.id,
        email: userB.email,
        handle: userB.handle,
        role: userB.role,
      });

      // User A stars opp-1
      const saveReq = new Request('http://localhost:3000/api/user/interactions', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenA}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          eventId: 'opp-1',
          data: { starred: true, participating: true },
        }),
      });
      const saveRes = await interactionsPOST(saveReq);
      expect(saveRes.status).toBe(200);

      // User B reads their interactions: opp-1 must not be starred for User B
      const getReqB = new Request('http://localhost:3000/api/user/interactions', {
        headers: { authorization: `Bearer ${tokenB}` },
      });
      const getResB = await interactionsGET(getReqB);
      const dataB = await getResB.json();
      expect(dataB.data['opp-1']).toBeUndefined();

      // User A reads their interactions: opp-1 is present
      const getReqA = new Request('http://localhost:3000/api/user/interactions', {
        headers: { authorization: `Bearer ${tokenA}` },
      });
      const getResA = await interactionsGET(getReqA);
      const dataA = await getResA.json();
      expect(dataA.data['opp-1'].starred).toBe(true);
    });

    it('isolates notification preferences strictly by authenticated session', async () => {
      const user = await saveProfile({
        id: 'usr-pref',
        email: 'pref@example.com',
        name: 'Pref User',
        handle: 'pref',
        role: 'user',
        createdAt: new Date().toISOString(),
      });

      const token = createSessionToken({
        userId: user.id,
        email: user.email,
        handle: user.handle,
        role: user.role,
      });

      // Query preferences without token -> 401
      const unauthReq = new Request('http://localhost:3000/api/user/preferences');
      const unauthRes = await preferencesGET(unauthReq);
      expect(unauthRes.status).toBe(401);

      // Query with token -> 200 and email_enabled default false
      const authReq = new Request('http://localhost:3000/api/user/preferences', {
        headers: { authorization: `Bearer ${token}` },
      });
      const authRes = await preferencesGET(authReq);
      expect(authRes.status).toBe(200);
      const json = await authRes.json();
      expect(json.data.email_enabled).toBe(false);
    });
  });
});
