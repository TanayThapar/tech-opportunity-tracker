'use client';

import { UserEventInteraction, EventComment } from '@/types';
import { getCurrentUser, getAuthHeaders } from '@/lib/auth';

function getStorageKey(): string {
  const user = getCurrentUser();
  const suffix = user?.id ? `_${user.id}` : '_guest';
  return `techradar_interactions_v2${suffix}`;
}

export function getAllInteractions(): Record<string, UserEventInteraction> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getInteraction(eventId: string): UserEventInteraction {
  const all = getAllInteractions();
  return all[eventId] || { starred: false, participating: false, comments: [], reminderEnabled: false };
}

export function saveInteraction(eventId: string, data: Partial<UserEventInteraction>): UserEventInteraction {
  const all = getAllInteractions();
  const current = all[eventId] || { starred: false, participating: false, comments: [], reminderEnabled: false };
  const updated: UserEventInteraction = {
    ...current,
    ...data,
  };
  all[eventId] = updated;

  if (typeof window !== 'undefined') {
    localStorage.setItem(getStorageKey(), JSON.stringify(all));
    window.dispatchEvent(new Event('techradar_interaction_change'));

    // Sync with server in background if user is authenticated
    const user = getCurrentUser();
    if (user) {
      fetch('/api/user/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ eventId, data: updated }),
      }).catch(err => {
        console.warn('Background sync for user interaction failed:', err);
      });
    }
  }

  return updated;
}

export function toggleStar(eventId: string): boolean {
  const curr = getInteraction(eventId);
  const nextVal = !curr.starred;
  saveInteraction(eventId, { starred: nextVal });
  return nextVal;
}

export function toggleParticipating(eventId: string): boolean {
  const curr = getInteraction(eventId);
  const nextVal = !curr.participating;
  saveInteraction(eventId, { participating: nextVal });
  return nextVal;
}

export function toggleReminder(eventId: string): boolean {
  const curr = getInteraction(eventId);
  const nextVal = !curr.reminderEnabled;
  saveInteraction(eventId, { reminderEnabled: nextVal });
  return nextVal;
}

export function addComment(eventId: string, author: string, text: string): EventComment {
  const curr = getInteraction(eventId);
  const newComment: EventComment = {
    id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    author: author.trim() || 'Anonymous Hacker',
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };
  const comments = [...(curr.comments || []), newComment];
  saveInteraction(eventId, { comments });
  return newComment;
}

/**
 * Loads server-persisted user interactions upon login to populate client state.
 */
export async function syncInteractionsFromServer(): Promise<Record<string, UserEventInteraction>> {
  const user = getCurrentUser();
  if (!user || typeof window === 'undefined') return {};

  try {
    const res = await fetch('/api/user/interactions', { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        localStorage.setItem(getStorageKey(), JSON.stringify(data.data));
        window.dispatchEvent(new Event('techradar_interaction_change'));
        return data.data;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch user interactions from server:', err);
  }
  return getAllInteractions();
}
