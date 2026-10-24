import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import {
  TechOpportunity,
  PipelineRunLog,
  UserEventInteraction,
  UserUpdate,
  NotificationPreference,
  NotificationRecord,
  RoleAuditLog,
} from '@/types';
import { UserProfile, UserRole } from '@/types/auth';
import { SEED_OPPORTUNITIES } from '@/data/seedOpportunities';

// In-memory / file fallback for local offline testing and development
const DATA_DIR = path.join(process.cwd(), '.data');
const EVENTS_FILE = path.join(DATA_DIR, 'opportunities.json');
const LOGS_FILE = path.join(DATA_DIR, 'pipeline_logs.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Read-only filesystem (e.g. some serverless environments)
  }
}

// Global in-memory cache to guarantee fast and synchronous isolation in unit tests
let isTestStoreActive = false;
let memoryOpportunities: TechOpportunity[] | null = null;
let memoryLogs: PipelineRunLog[] = [];
let memoryProfiles: Map<string, UserProfile> = new Map();
let memoryInteractions: Map<string, Record<string, UserEventInteraction>> = new Map();
let memoryPreferences: Map<string, NotificationPreference> = new Map();
let memoryUpdates: Map<string, UserUpdate[]> = new Map();
let memoryNotifications: Set<string> = new Set();
let memoryAuditLogs: RoleAuditLog[] = [];

/**
 * Returns a server Supabase client if environment credentials exist.
 */
function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  // Use service role key if available for server-side store operations, fallback to anon key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return null;
}

// ── OPPORTUNITIES ─────────────────────────────────────────────────────────────

export async function getOpportunities(filter?: {
  status?: string;
  type?: string;
  company?: string;
  tier?: string;
}): Promise<TechOpportunity[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    let query = supabase.from('opportunities').select('*');
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    if (filter?.type && filter.type !== 'all') {
      query = query.eq('type', filter.type);
    }
    if (filter?.company && filter.company !== 'all') {
      query = query.eq('company', filter.company);
    }
    if (filter?.tier && filter.tier !== 'all') {
      query = query.eq('conference_tier', filter.tier);
    }

    const { data, error } = await query.order('start_date', { ascending: true });
    if (error) {
      console.error('Supabase getOpportunities error:', error);
      return [];
    }
    return (data as TechOpportunity[]) || [];
  }

  // Fallback to memory / file store
  if (!isTestStoreActive && (memoryOpportunities === null || !memoryOpportunities.some(o => o.status === 'published'))) {
    ensureDataDir();
    if (fs.existsSync(EVENTS_FILE)) {
      try {
        const raw = fs.readFileSync(EVENTS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length >= SEED_OPPORTUNITIES.length) {
          memoryOpportunities = parsed;
        } else {
          const existingIds = new Set(Array.isArray(parsed) ? parsed.map((p: any) => p.id) : []);
          const missingSeeds = SEED_OPPORTUNITIES.filter(s => !existingIds.has(s.id));
          memoryOpportunities = [...(Array.isArray(parsed) ? parsed : []), ...missingSeeds];
        }
      } catch {
        memoryOpportunities = [...SEED_OPPORTUNITIES];
      }
    } else {
      memoryOpportunities = [...SEED_OPPORTUNITIES];
    }
  } else if (memoryOpportunities === null) {
    memoryOpportunities = [];
  }

  let list = [...(memoryOpportunities || [])];
  if (filter?.status) {
    list = list.filter(o => o.status === filter.status);
  }
  if (filter?.type && filter.type !== 'all') {
    list = list.filter(o => o.type === filter.type);
  }
  if (filter?.company && filter.company !== 'all') {
    list = list.filter(o => (o.company || o.organizer) === filter.company);
  }
  if (filter?.tier && filter.tier !== 'all') {
    list = list.filter(o => o.conference_tier === filter.tier);
  }

  return list.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
}

export async function getOpportunityById(id: string): Promise<TechOpportunity | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from('opportunities').select('*').eq('id', id).single();
    if (error || !data) return null;
    return data as TechOpportunity;
  }

  const all = await getOpportunities();
  return all.find(o => o.id === id) || null;
}

export async function saveOpportunities(opportunities: TechOpportunity[]): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from('opportunities').upsert(opportunities, { onConflict: 'id' });
    if (error) {
      console.error('Supabase saveOpportunities error:', error);
      throw error;
    }
    return;
  }

  memoryOpportunities = [...opportunities];
  try {
    ensureDataDir();
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(opportunities, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write opportunities to disk fallback:', err);
  }
}

export async function addOpportunity(opportunity: TechOpportunity): Promise<TechOpportunity> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from('opportunities').insert(opportunity).select().single();
    if (error) {
      console.error('Supabase addOpportunity error:', error);
      throw error;
    }
    return data as TechOpportunity;
  }

  const list = await getOpportunities();
  list.push(opportunity);
  await saveOpportunities(list);
  return opportunity;
}

export async function updateOpportunity(
  id: string,
  updates: Partial<TechOpportunity>
): Promise<TechOpportunity | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('opportunities')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Supabase updateOpportunity error:', error);
      return null;
    }
    return data as TechOpportunity;
  }

  const list = await getOpportunities();
  const index = list.findIndex(o => o.id === id);
  if (index === -1) return null;

  list[index] = {
    ...list[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  await saveOpportunities(list);
  return list[index];
}

export async function deleteOpportunity(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from('opportunities').delete().eq('id', id);
    return !error;
  }

  const list = await getOpportunities();
  const filtered = list.filter(o => o.id !== id);
  if (filtered.length === list.length) return false;
  await saveOpportunities(filtered);
  return true;
}

// ── PIPELINE LOGS ─────────────────────────────────────────────────────────────

export async function getPipelineLogs(): Promise<PipelineRunLog[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('pipeline_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    if (error) {
      console.error('Supabase getPipelineLogs error:', error);
      return [];
    }
    return (data as PipelineRunLog[]) || [];
  }

  if (memoryLogs.length === 0) {
    ensureDataDir();
    if (fs.existsSync(LOGS_FILE)) {
      try {
        const raw = fs.readFileSync(LOGS_FILE, 'utf-8');
        memoryLogs = JSON.parse(raw);
      } catch {
        memoryLogs = [];
      }
    }
  }

  return [...memoryLogs];
}

export async function appendPipelineLog(log: PipelineRunLog): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from('pipeline_logs').insert(log);
    if (error) {
      console.error('Supabase appendPipelineLog error:', error);
    }
    return;
  }

  memoryLogs.unshift(log);
  if (memoryLogs.length > 100) memoryLogs.splice(100);
  try {
    ensureDataDir();
    fs.writeFileSync(LOGS_FILE, JSON.stringify(memoryLogs, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write pipeline logs to disk fallback:', err);
  }
}

// ── PROFILES & ROLES (Problem 8) ──────────────────────────────────────────────

const IMMUTABLE_ROOT_ADMINS = ['tanaythapar', 'sanvi850'];

export function isImmutableRootAdminUser(identifier?: string | null): boolean {
  if (!identifier) return false;
  const clean = identifier.toLowerCase().trim().replace(/^@/, '');
  const handle = clean.split('@')[0];
  return IMMUTABLE_ROOT_ADMINS.some(
    root => clean === root || handle === root || (clean.includes('@') && clean.startsWith(root))
  );
}

export async function getAllProfiles(): Promise<UserProfile[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    return (data as UserProfile[]) || [];
  }

  // Ensure root admin profiles exist in memory store for local development/testing
  if (!memoryProfiles.has('usr-tanaythapar')) {
    memoryProfiles.set('usr-tanaythapar', {
      id: 'usr-tanaythapar',
      email: 'tanaythapar@example.com',
      name: 'TanayThapar',
      handle: 'tanaythapar',
      role: 'admin',
      createdAt: '2026-09-01T00:00:00Z',
    });
  }
  if (!memoryProfiles.has('usr-sanvi850')) {
    memoryProfiles.set('usr-sanvi850', {
      id: 'usr-sanvi850',
      email: 'sanvi850@example.com',
      name: 'Sanvi850',
      handle: 'sanvi850',
      role: 'admin',
      createdAt: '2026-09-01T00:00:00Z',
    });
  }

  return Array.from(memoryProfiles.values());
}

export async function getProfileById(id: string): Promise<UserProfile | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    return data ? (data as UserProfile) : null;
  }
  return memoryProfiles.get(id) || null;
}

export async function getProfileByEmail(email: string): Promise<UserProfile | null> {
  const clean = email.toLowerCase().trim();
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data } = await supabase.from('profiles').select('*').eq('email', clean).single();
    return data ? (data as UserProfile) : null;
  }

  for (const p of memoryProfiles.values()) {
    if (p.email.toLowerCase() === clean) return p;
  }
  return null;
}

export async function getProfileByHandle(handle: string): Promise<UserProfile | null> {
  const clean = handle.toLowerCase().trim().replace(/^@/, '');
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data } = await supabase.from('profiles').select('*').eq('handle', clean).single();
    return data ? (data as UserProfile) : null;
  }

  for (const p of memoryProfiles.values()) {
    if (p.handle.toLowerCase().replace(/^@/, '') === clean) return p;
  }
  return null;
}

export async function saveProfile(profile: UserProfile): Promise<UserProfile> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data as UserProfile;
  }

  memoryProfiles.set(profile.id, profile);
  return profile;
}

export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole,
  changedBy: string
): Promise<boolean> {
  const target = await getProfileById(targetUserId);
  if (!target) return false;

  // Root administrators TanayThapar and Sanvi850 have permanent admin access that cannot be changed
  if (isImmutableRootAdminUser(target.handle) || isImmutableRootAdminUser(target.email) || isImmutableRootAdminUser(target.id)) {
    console.warn(`Blocked attempt to alter immutable root administrator role: ${target.handle}`);
    return false;
  }

  const oldRole = target.role;

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);
    if (updateErr) return false;

    // Log to audit log
    await supabase.from('role_audit_logs').insert({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      target_user_id: targetUserId,
      changed_by: changedBy,
      old_role: oldRole,
      new_role: newRole,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  target.role = newRole;
  memoryProfiles.set(targetUserId, target);

  memoryAuditLogs.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    target_user_id: targetUserId,
    changed_by: changedBy,
    old_role: oldRole,
    new_role: newRole,
    timestamp: new Date().toISOString(),
  });

  return true;
}

// ── USER INTERACTIONS (Row Level Isolation) ───────────────────────────────────

export async function getUserInteractions(userId: string): Promise<Record<string, UserEventInteraction>> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', userId);
    if (error || !data) return {};

    const map: Record<string, UserEventInteraction> = {};
    for (const row of data) {
      map[row.opportunity_id] = {
        starred: row.starred,
        participating: row.participating,
        reminderEnabled: row.reminder_enabled,
        comments: row.comments || [],
      };
    }
    return map;
  }

  return memoryInteractions.get(userId) || {};
}

export async function saveUserInteraction(
  userId: string,
  opportunityId: string,
  interaction: Partial<UserEventInteraction>
): Promise<UserEventInteraction> {
  const current = (await getUserInteractions(userId))[opportunityId] || {
    starred: false,
    participating: false,
    reminderEnabled: false,
    comments: [],
  };

  const updated: UserEventInteraction = {
    ...current,
    ...interaction,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('user_interactions').upsert(
      {
        id: `${userId}-${opportunityId}`,
        user_id: userId,
        opportunity_id: opportunityId,
        starred: updated.starred || false,
        participating: updated.participating || false,
        reminder_enabled: updated.reminderEnabled || false,
        comments: updated.comments || [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,opportunity_id' }
    );
    return updated;
  }

  const userMap = memoryInteractions.get(userId) || {};
  userMap[opportunityId] = updated;
  memoryInteractions.set(userId, userMap);
  return updated;
}

// ── NOTIFICATION PREFERENCES & UPDATES (Problem 7) ────────────────────────────

export async function getNotificationPreference(userId: string): Promise<NotificationPreference> {
  const defaultPref: NotificationPreference = {
    user_id: userId,
    in_app_enabled: true,
    email_enabled: false,
    categories: ['hackathon', 'conference', 'workshop', 'internship', 'job'],
    unsubscribe_token: `unsub-${userId}-${Math.random().toString(36).slice(2, 8)}`,
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data } = await supabase.from('notification_preferences').select('*').eq('user_id', userId).single();
    if (data) return data as NotificationPreference;
    await supabase.from('notification_preferences').insert(defaultPref);
    return defaultPref;
  }

  if (!memoryPreferences.has(userId)) {
    memoryPreferences.set(userId, defaultPref);
  }
  return memoryPreferences.get(userId)!;
}

export async function saveNotificationPreference(pref: NotificationPreference): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('notification_preferences').upsert(pref, { onConflict: 'user_id' });
    return;
  }
  memoryPreferences.set(pref.user_id, pref);
}

export async function unsubscribeByToken(token: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('unsubscribe_token', token)
      .single();
    if (!data) return false;

    await supabase
      .from('notification_preferences')
      .update({ email_enabled: false, updated_at: new Date().toISOString() })
      .eq('unsubscribe_token', token);
    return true;
  }

  for (const [uid, pref] of memoryPreferences.entries()) {
    if (pref.unsubscribe_token === token) {
      pref.email_enabled = false;
      pref.updated_at = new Date().toISOString();
      memoryPreferences.set(uid, pref);
      return true;
    }
  }
  return false;
}

export async function getUserUpdates(userId: string): Promise<UserUpdate[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data } = await supabase
      .from('user_updates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return (data as UserUpdate[]) || [];
  }
  return memoryUpdates.get(userId) || [];
}

export async function addUserUpdate(update: Omit<UserUpdate, 'id' | 'created_at'>): Promise<UserUpdate> {
  const full: UserUpdate = {
    ...update,
    id: `upd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('user_updates').insert(full);
    return full;
  }

  const list = memoryUpdates.get(update.user_id) || [];
  list.unshift(full);
  memoryUpdates.set(update.user_id, list);
  return full;
}

export async function markUpdateAsRead(userId: string, updateId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase
      .from('user_updates')
      .update({ read: true })
      .eq('id', updateId)
      .eq('user_id', userId);
    return !error;
  }

  const list = memoryUpdates.get(userId) || [];
  const item = list.find(u => u.id === updateId);
  if (item) {
    item.read = true;
    return true;
  }
  return false;
}

export async function hasNotificationBeenSent(
  userId: string,
  eventKey: string,
  channel: 'in_app' | 'email'
): Promise<boolean> {
  const key = `${userId}-${eventKey}-${channel}`;
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('event_key', eventKey)
      .eq('channel', channel)
      .single();
    return !!data;
  }
  return memoryNotifications.has(key);
}

export async function recordNotification(
  record: Omit<NotificationRecord, 'id' | 'created_at'>
): Promise<void> {
  const full: NotificationRecord = {
    ...record,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
  };

  const key = `${record.user_id}-${record.event_key}-${record.channel}`;
  memoryNotifications.add(key);

  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('notifications').insert(full);
  }
}

// Reset memory store helper for unit test isolation
export function _resetMemoryStoreForTests(): void {
  isTestStoreActive = true;
  memoryOpportunities = [];
  memoryLogs = [];
  memoryProfiles.clear();
  memoryInteractions.clear();
  memoryPreferences.clear();
  memoryUpdates.clear();
  memoryNotifications.clear();
  memoryAuditLogs = [];
}
