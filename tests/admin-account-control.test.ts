import { describe, it, expect, beforeEach } from 'vitest';
import { POST as updateRolePost, DELETE as deleteUserDelete } from '@/app/api/admin/roles/route';
import { POST as loginPost } from '@/app/api/auth/login/route';
import {
  _resetMemoryStoreForTests,
  saveProfile,
  getProfileById,
  savePendingOtp,
} from '@/lib/store';
import { createSessionToken, getAuthenticatedUser, requireRole } from '@/lib/serverAuth';

describe('Admin Account Access Control (Revoke & Erase)', () => {
  let adminToken: string;
  let adminUserId: string;

  beforeEach(async () => {
    _resetMemoryStoreForTests();

    // Setup an admin user
    const admin = await saveProfile({
      id: 'usr-admin-alex',
      email: 'alex.admin@radar.internal',
      name: 'Alex Admin',
      handle: 'alexadmin',
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

  it('allows an admin to revoke a user account access', async () => {
    // Create target user
    const user = await saveProfile({
      id: 'usr-target-bob',
      email: 'bob@example.com',
      name: 'Bob Target',
      handle: 'bobtarget',
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
    const data = await res.json();
    expect(data.success).toBe(true);

    const updated = await getProfileById(user.id);
    expect(updated?.role).toBe('revoked');
  });

  it('blocks revoked users from logging in with HTTP 403', async () => {
    // Create revoked user
    await saveProfile({
      id: 'usr-revoked-dave',
      email: 'dave@example.com',
      name: 'Dave Revoked',
      handle: 'daverevoked',
      role: 'revoked',
      createdAt: new Date().toISOString(),
    });

    const loginReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'dave@example.com' }),
    });

    const loginRes = await loginPost(loginReq);
    expect(loginRes.status).toBe(403);
    const data = await loginRes.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('revoked');
  });

  it('invalidates existing tokens/sessions when a user is revoked', async () => {
    const user = await saveProfile({
      id: 'usr-active-charlie',
      email: 'charlie@example.com',
      name: 'Charlie Active',
      handle: 'charlieactive',
      role: 'user',
      createdAt: new Date().toISOString(),
    });

    const userToken = createSessionToken({
      userId: user.id,
      email: user.email,
      handle: user.handle,
      role: 'user',
    });

    const reqBefore = new Request('http://localhost:3000/api/user/preferences', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const authedBefore = await getAuthenticatedUser(reqBefore);
    expect(authedBefore).not.toBeNull();
    expect(authedBefore?.id).toBe(user.id);

    // Revoke Charlie
    await saveProfile({
      ...user,
      role: 'revoked',
    });

    const reqAfter = new Request('http://localhost:3000/api/user/preferences', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const authedAfter = await getAuthenticatedUser(reqAfter);
    expect(authedAfter).toBeNull();

    const { errorResponse } = await requireRole(reqAfter, ['user', 'admin']);
    expect(errorResponse).not.toBeNull();
    expect(errorResponse?.status).toBe(401);
  });

  it('allows an admin to completely erase a user account via DELETE', async () => {
    const target = await saveProfile({
      id: 'usr-to-erase',
      email: 'erase.me@example.com',
      name: 'Erase Candidate',
      handle: 'eraseme',
      role: 'user',
      createdAt: new Date().toISOString(),
    });

    const deleteReq = new Request(`http://localhost:3000/api/admin/roles?userId=${target.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const res = await deleteUserDelete(deleteReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('eraseme');

    // Profile should no longer exist
    const fetched = await getProfileById(target.id);
    expect(fetched).toBeNull();
  });

  it('strictly protects immutable root administrators from role revocation', async () => {
    // Setup root admin in store
    const root = await saveProfile({
      id: 'usr-root-tanay',
      email: 'tanaythapar@example.com',
      name: 'Tanay Thapar',
      handle: 'TanayThapar',
      role: 'admin',
      createdAt: new Date().toISOString(),
    });

    const req = new Request('http://localhost:3000/api/admin/roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        targetUserId: root.id,
        newRole: 'revoked',
      }),
    });

    const res = await updateRolePost(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('TanayThapar and Sanvi850');

    // Ensure role remained unchanged
    const stored = await getProfileById(root.id);
    expect(stored?.role).toBe('admin');
  });

  it('strictly protects immutable root administrators from account erasure', async () => {
    const root = await saveProfile({
      id: 'usr-root-sanvi',
      email: 'sanvi850@example.com',
      name: 'Sanvi',
      handle: 'Sanvi850',
      role: 'admin',
      createdAt: new Date().toISOString(),
    });

    const deleteReq = new Request(`http://localhost:3000/api/admin/roles?userId=${root.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const res = await deleteUserDelete(deleteReq);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Protected Account');

    // Profile must still exist
    const stored = await getProfileById(root.id);
    expect(stored).not.toBeNull();
  });

  it('prevents an admin from deleting or revoking their own active account', async () => {
    // Self-revocation
    const revokeSelfReq = new Request('http://localhost:3000/api/admin/roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        targetUserId: adminUserId,
        newRole: 'revoked',
      }),
    });
    const revokeRes = await updateRolePost(revokeSelfReq);
    expect(revokeRes.status).toBe(400);
    const revokeData = await revokeRes.json();
    expect(revokeData.error).toContain('Self-revocation forbidden');

    // Self-deletion
    const deleteSelfReq = new Request(`http://localhost:3000/api/admin/roles?userId=${adminUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteRes = await deleteUserDelete(deleteSelfReq);
    expect(deleteRes.status).toBe(400);
    const deleteData = await deleteRes.json();
    expect(deleteData.error).toContain('Self-deletion forbidden');
  });

  it('rejects unauthenticated or non-admin attempts to access admin role controls', async () => {
    const normalUser = await saveProfile({
      id: 'usr-normal-sarah',
      email: 'sarah@example.com',
      name: 'Sarah Normal',
      handle: 'sarahnormal',
      role: 'user',
      createdAt: new Date().toISOString(),
    });

    const userToken = createSessionToken({
      userId: normalUser.id,
      email: normalUser.email,
      handle: normalUser.handle,
      role: 'user',
    });

    const unauthedReq = new Request('http://localhost:3000/api/admin/roles?userId=any-id', {
      method: 'DELETE',
    });
    const unauthedRes = await deleteUserDelete(unauthedReq);
    expect(unauthedRes.status).toBe(401);

    const normalReq = new Request('http://localhost:3000/api/admin/roles?userId=any-id', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const normalRes = await deleteUserDelete(normalReq);
    expect(normalRes.status).toBe(403);
  });
});
