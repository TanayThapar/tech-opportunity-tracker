import { describe, it, expect, beforeEach } from 'vitest';
import {
  _resetMemoryStoreForTests,
  saveProfile,
  appendAuditLog,
  getSystemAuditLogs,
} from '@/lib/store';
import { GET as getAuditLogsGet } from '@/app/api/admin/audit-logs/route';
import { POST as updateRolePost, DELETE as deleteUserDelete } from '@/app/api/admin/roles/route';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { createSessionToken } from '@/lib/serverAuth';

describe('System Audit & Activity Logging System', () => {
  let adminToken: string;
  let adminUserId: string;

  beforeEach(async () => {
    _resetMemoryStoreForTests();

    // Setup an admin user
    const admin = await saveProfile({
      id: 'usr-admin-maya',
      email: 'maya.admin@radar.internal',
      name: 'Maya Admin',
      handle: 'mayaadmin',
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
    adminUserId = admin.id;
    adminToken = createSessionToken({
      userId: admin.id,
      email: admin.email,
      handle: admin.handle,
      role: 'admin',
    });
  });

  it('records an audit log entry with timestamp and actor', async () => {
    const entry = await appendAuditLog({
      category: 'admin',
      action: 'ADMIN_ROLE_CHANGE',
      actor: { handle: 'mayaadmin', role: 'admin' },
      target: { type: 'user', label: '@david' },
      status: 'success',
      description: 'Promoted user @david to moderator',
    });

    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeDefined();
    expect(entry.action).toBe('ADMIN_ROLE_CHANGE');
    expect(entry.status).toBe('success');

    const logs = await getSystemAuditLogs();
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].description).toBe('Promoted user @david to moderator');
  });

  it('filters audit logs by category and status', async () => {
    await appendAuditLog({
      category: 'auth',
      action: 'AUTH_LOGIN_SUCCESS',
      actor: { handle: 'alice' },
      status: 'success',
      description: 'Alice logged in',
    });

    await appendAuditLog({
      category: 'security',
      action: 'AUTH_LOGIN_FAILED',
      actor: { handle: 'hacker' },
      status: 'failure',
      description: 'Hacker failed root login',
    });

    const authLogs = await getSystemAuditLogs({ category: 'auth' });
    expect(authLogs.every(l => l.category === 'auth')).toBe(true);
    expect(authLogs.some(l => l.action === 'AUTH_LOGIN_SUCCESS')).toBe(true);

    const failureLogs = await getSystemAuditLogs({ status: 'failure' });
    expect(failureLogs.every(l => l.status === 'failure')).toBe(true);
    expect(failureLogs.some(l => l.action === 'AUTH_LOGIN_FAILED')).toBe(true);
  });

  it('searches audit logs by query text across description, actor and target', async () => {
    await appendAuditLog({
      category: 'content',
      action: 'OPPORTUNITY_SUBMITTED',
      actor: { handle: 'researcher42' },
      target: { type: 'opportunity', label: 'Quantum Computing Summit 2027' },
      status: 'info',
      description: 'New opportunity submitted: Quantum Computing Summit 2027',
    });

    const searchResults = await getSystemAuditLogs({ search: 'Quantum Computing' });
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].description).toContain('Quantum Computing Summit 2027');

    const actorSearch = await getSystemAuditLogs({ search: 'researcher42' });
    expect(actorSearch.length).toBe(1);
  });

  it('automatically logs role changes and account revocations performed by admin', async () => {
    const user = await saveProfile({
      id: 'usr-target-kevin',
      email: 'kevin@example.com',
      name: 'Kevin Target',
      handle: 'kevintarget',
      role: 'user',
      createdAt: new Date().toISOString(),
    });

    const req = new Request('http://localhost:3000/api/admin/roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        targetUserId: user.id,
        newRole: 'revoked',
      }),
    });

    const res = await updateRolePost(req);
    expect(res.status).toBe(200);

    const logs = await getSystemAuditLogs({ category: 'admin' });
    const revokeLog = logs.find(l => l.action === 'ADMIN_ACCOUNT_REVOKED');
    expect(revokeLog).toBeDefined();
    expect(revokeLog?.description).toContain('revoked access for @kevintarget');
  });

  it('automatically logs account erasure performed by admin', async () => {
    const user = await saveProfile({
      id: 'usr-delete-target',
      email: 'delete.me@example.com',
      name: 'To Delete',
      handle: 'todelete',
      role: 'user',
      createdAt: new Date().toISOString(),
    });

    const deleteReq = new Request(`http://localhost:3000/api/admin/roles?userId=${user.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const res = await deleteUserDelete(deleteReq);
    expect(res.status).toBe(200);

    const logs = await getSystemAuditLogs({ category: 'admin' });
    const eraseLog = logs.find(l => l.action === 'ADMIN_ACCOUNT_ERASED');
    expect(eraseLog).toBeDefined();
    expect(eraseLog?.description).toContain('permanently erased account @todelete');
  });

  it('automatically logs failed and successful login events', async () => {
    // 1. Failed root login
    const failedRootReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'TanayThapar', password: 'WrongPassword' }),
    });
    await loginPost(failedRootReq);

    // 2. Successful root login
    const successRootReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'TanayThapar', password: 'Manipal' }),
    });
    await loginPost(successRootReq);

    const logs = await getSystemAuditLogs();
    const failedLog = logs.find(l => l.action === 'AUTH_LOGIN_FAILED' && l.description.includes('Invalid root password'));
    const successLog = logs.find(l => l.action === 'AUTH_ROOT_LOGIN');

    expect(failedLog).toBeDefined();
    expect(successLog).toBeDefined();
  });

  it('serves audit logs through GET /api/admin/audit-logs with RBAC check', async () => {
    await appendAuditLog({
      category: 'admin',
      action: 'ADMIN_ROLE_CHANGE',
      actor: { handle: 'mayaadmin' },
      status: 'success',
      description: 'Audit log endpoint verification test',
    });

    // Unauthenticated request
    const unauthedReq = new Request('http://localhost:3000/api/admin/audit-logs');
    const unauthedRes = await getAuditLogsGet(unauthedReq);
    expect(unauthedRes.status).toBe(401);

    // Authenticated admin request
    const authedReq = new Request('http://localhost:3000/api/admin/audit-logs?search=verification', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const authedRes = await getAuditLogsGet(authedReq);
    expect(authedRes.status).toBe(200);
    const data = await authedRes.json();
    expect(data.success).toBe(true);
    expect(data.count).toBeGreaterThanOrEqual(1);
    expect(data.data[0].description).toContain('Audit log endpoint verification test');
  });
});
