import { describe, it, expect, beforeEach } from 'vitest';
import {
  _resetMemoryStoreForTests,
  saveProfile,
  getNotificationPreference,
  saveNotificationPreference,
  unsubscribeByToken,
} from '@/lib/store';
import { processUserUpdatesAndNotifications } from '@/lib/notifications';
import { TechOpportunity } from '@/types';

describe('Notifications & Update Digest', () => {
  beforeEach(() => {
    _resetMemoryStoreForTests();
  });

  it('respects email opt-out and does not send emails to non-opted-in users', async () => {
    const userId = 'user_optout_1';
    await saveProfile({
      id: userId,
      email: 'optout@example.com',
      name: 'Opt Out User',
      handle: 'optout',
      role: 'user',
      createdAt: '2026-10-24',
    });

    const pref = await getNotificationPreference(userId);
    expect(pref.email_enabled).toBe(false); // Default is false

    const newOpp: TechOpportunity = {
      id: 'opp-notif-1',
      title: 'NeurIPS 2027 Conference',
      type: 'conference',
      organizer: 'NeurIPS',
      start_date: '2027-12-01',
      end_date: '2027-12-07',
      format: 'in-person',
      source_url: 'https://neurips.cc',
      description: 'Annual conference',
      discovery_confidence: 'high',
      status: 'published',
      created_at: '2026-10-24',
      updated_at: '2026-10-24',
    };

    const res = await processUserUpdatesAndNotifications([newOpp], [newOpp], [], [userId]);

    // In-app update should be generated, but zero emails sent
    expect(res.updatesGenerated).toBe(1);
    expect(res.emailsSent).toBe(0);
  });

  it('prevents duplicate sends using deduplication keys', async () => {
    const userId = 'user_repeat_1';
    await saveProfile({
      id: userId,
      email: 'repeat@example.com',
      name: 'Repeat User',
      handle: 'repeat',
      role: 'user',
      createdAt: '2026-10-24',
    });

    const newOpp: TechOpportunity = {
      id: 'opp-dedup-1',
      title: 'ICLR 2027 Conference',
      type: 'conference',
      organizer: 'ICLR',
      start_date: '2027-05-01',
      end_date: '2027-05-05',
      format: 'in-person',
      source_url: 'https://iclr.cc',
      description: 'Deep learning conference',
      discovery_confidence: 'high',
      status: 'published',
      created_at: '2026-10-24',
      updated_at: '2026-10-24',
    };

    // First run generates update
    const firstRun = await processUserUpdatesAndNotifications([newOpp], [newOpp], [], [userId]);
    expect(firstRun.updatesGenerated).toBe(1);

    // Second run with the same event should be deduplicated
    const secondRun = await processUserUpdatesAndNotifications([newOpp], [newOpp], [], [userId]);
    expect(secondRun.updatesGenerated).toBe(0);
  });

  it('disables email notifications via one-click unsubscribe token', async () => {
    const userId = 'user_unsub_1';
    await saveProfile({
      id: userId,
      email: 'unsub@example.com',
      name: 'Unsub User',
      handle: 'unsub',
      role: 'user',
      createdAt: '2026-10-24',
    });

    const pref = await getNotificationPreference(userId);
    pref.email_enabled = true;
    await saveNotificationPreference(pref);

    expect((await getNotificationPreference(userId)).email_enabled).toBe(true);

    // Click unsubscribe with token
    const unsubSuccess = await unsubscribeByToken(pref.unsubscribe_token);
    expect(unsubSuccess).toBe(true);

    // Preference must now be disabled
    const updatedPref = await getNotificationPreference(userId);
    expect(updatedPref.email_enabled).toBe(false);
  });
});
