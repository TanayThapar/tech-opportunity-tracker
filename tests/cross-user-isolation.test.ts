import { describe, it, expect, beforeEach } from 'vitest';
import {
  _resetMemoryStoreForTests,
  saveUserInteraction,
  getUserInteractions,
  saveNotificationPreference,
  getNotificationPreference,
  addUserUpdate,
  getUserUpdates,
} from '@/lib/store';

describe('Cross-User Data Isolation', () => {
  beforeEach(() => {
    _resetMemoryStoreForTests();
  });

  it('ensures User A cannot read or write User B interactions', async () => {
    const userA = 'user_alpha_123';
    const userB = 'user_beta_456';
    const oppId = 'opp_neurips_2027';

    // User A stars the event and leaves a private comment
    await saveUserInteraction(userA, oppId, {
      starred: true,
      participating: true,
      comments: [{ id: 'c1', author: 'User A', text: 'Preparing paper submission', timestamp: '2026-10-24' }],
    });

    // User B has not starred the event
    const userBInteractions = await getUserInteractions(userB);
    expect(userBInteractions[oppId]).toBeUndefined();

    // User A reads their own interactions
    const userAInteractions = await getUserInteractions(userA);
    expect(userAInteractions[oppId]?.starred).toBe(true);
    expect(userAInteractions[oppId]?.participating).toBe(true);
    expect(userAInteractions[oppId]?.comments?.length).toBe(1);

    // User B writes their own interaction without overwriting User A
    await saveUserInteraction(userB, oppId, {
      starred: false,
      participating: false,
    });

    const refreshedUserA = await getUserInteractions(userA);
    expect(refreshedUserA[oppId]?.starred).toBe(true); // Still starred for User A
  });

  it('ensures notification preferences are isolated per user', async () => {
    const userA = 'user_alpha_123';
    const userB = 'user_beta_456';

    const prefA = await getNotificationPreference(userA);
    prefA.email_enabled = true;
    prefA.categories = ['conference', 'hackathon'];
    await saveNotificationPreference(prefA);

    const prefB = await getNotificationPreference(userB);
    expect(prefB.email_enabled).toBe(false); // Default is in-app only, email off

    expect(prefB.unsubscribe_token).not.toBe(prefA.unsubscribe_token);
  });

  it('ensures user updates stream is isolated per user', async () => {
    const userA = 'user_alpha_123';
    const userB = 'user_beta_456';

    await addUserUpdate({
      user_id: userA,
      opportunity_id: 'opp-1',
      type: 'deadline_approaching',
      title: 'NeurIPS deadline tomorrow',
      message: 'Paper registration closes in 24 hours',
      read: false,
    });

    const updatesA = await getUserUpdates(userA);
    const updatesB = await getUserUpdates(userB);

    expect(updatesA.length).toBe(1);
    expect(updatesB.length).toBe(0);
  });
});
