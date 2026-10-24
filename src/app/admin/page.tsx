'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { TechOpportunity, PipelineRunLog } from '@/types';
import { getCurrentUser, fetchCurrentUser, loginWithServer } from '@/lib/auth';
import { UserProfile, UserRole } from '@/types/auth';
import {
  ShieldAlert,
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  Layers,
  Lock,
  ArrowUpRight,
  Database,
  Cpu,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  UserCog,
  Briefcase,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { getAllInteractions } from '@/lib/interactions';

export default function AdminAnalyticsDashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [opportunities, setOpportunities] = useState<TechOpportunity[]>([]);
  const [logs, setLogs] = useState<PipelineRunLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Role management state
  const [targetUserId, setTargetUserId] = useState('');
  const [targetRole, setTargetRole] = useState<UserRole>('moderator');
  const [roleMessage, setRoleMessage] = useState<string | null>(null);

  useEffect(() => {
    const verifyAndFetch = async () => {
      try {
        setLoading(true);
        // Verify session with server to establish DB role
        let u = getCurrentUser();
        const serverUser = await fetchCurrentUser();
        if (serverUser) {
          u = serverUser;
        }
        setUser(u);

        const headers: Record<string, string> = {};
        if (u?.email) headers['x-user-email'] = u.email;
        if (u?.id) headers['x-user-id'] = u.id;
        if (u?.handle) headers['x-user-handle'] = u.handle;

        const [oppsRes, logsRes] = await Promise.all([
          fetch('/api/opportunities?status=published', { headers }),
          fetch('/api/pipeline/logs', { headers }),
        ]);
        const oppsJson = await oppsRes.json();
        const logsJson = await logsRes.json();

        if (oppsJson.success) setOpportunities(oppsJson.data);
        if (logsJson.success) setLogs(logsJson.data);
      } catch (err) {
        console.error('Failed loading admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyAndFetch();
  }, []);

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) return;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.email) headers['x-user-email'] = user.email;
      if (user?.id) headers['x-user-id'] = user.id;
      if (user?.handle) headers['x-user-handle'] = user.handle;

      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetUserId: targetUserId.trim(),
          newRole: targetRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRoleMessage(`Success: User ${targetUserId} updated to role "${targetRole}"`);
        setTargetUserId('');
        setTimeout(() => setRoleMessage(null), 4000);
      } else {
        setRoleMessage(`Error: ${data.error || 'Failed to update user role'}`);
      }
    } catch (err: any) {
      setRoleMessage(`Error: ${err.message}`);
    }
  };

  // Interactions statistics
  const userInteractions = useMemo(() => {
    return getAllInteractions();
  }, []);

  const starredTotal = useMemo(() => {
    return Object.values(userInteractions).filter(i => i.starred).length;
  }, [userInteractions]);

  const attendingTotal = useMemo(() => {
    return Object.values(userInteractions).filter(i => i.participating).length;
  }, [userInteractions]);

  // Aggregations
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      hackathon: 0,
      conference: 0,
      workshop: 0,
      internship: 0,
      job: 0,
    };
    opportunities.forEach(o => {
      if (counts[o.type] !== undefined) counts[o.type]++;
    });
    return counts;
  }, [opportunities]);

  const pipelineMetrics = useMemo(() => {
    const totalScanned = logs.reduce((acc, l) => acc + (l.events_scanned || 0), 0);
    const totalAdded = logs.reduce((acc, l) => acc + (l.events_added || 0), 0);
    const totalSkipped = logs.reduce((acc, l) => acc + (l.duplicates_skipped || 0), 0);
    const totalArchived = logs.reduce((acc, l) => acc + (l.events_archived || 0), 0);
    return { totalScanned, totalAdded, totalSkipped, totalArchived };
  }, [logs]);

  // Single authorization scheme: Database-verified Admin role
  const isAuthorized = user && user.role === 'admin';

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#070b0e] text-zinc-200 font-mono flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0b1016] border border-rose-500/50 rounded-xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/50">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              ADMIN WINDOW // SEPARATED FROM TESTERS
            </h2>
            <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-xs text-zinc-400 text-left space-y-1">
              <div className="text-amber-400 font-bold uppercase text-[10px]">ROLE SEPARATION ACTIVE:</div>
              <p>
                The administrative dashboard and crawler controls are isolated from tester views. Testers have access to the public discovery radar and personal calendar.
              </p>
              {user && (
                <div className="pt-1.5 text-zinc-500 text-[11px] border-t border-zinc-800/80">
                  Current session: <span className="text-emerald-400 font-bold">@{user.handle}</span> (Role: <span className="text-amber-400 font-bold">{user.role === 'user' ? 'Alpha Tester' : user.role}</span>)
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  const res = await loginWithServer('TanayThapar');
                  if (res.success && res.user) {
                    setUser(res.user);
                    window.location.reload();
                  }
                }}
                className="w-full py-2.5 bg-purple-950 hover:bg-purple-900 border border-purple-500 text-purple-200 font-bold text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Authenticate Session as @TanayThapar</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await loginWithServer('Sanvi850');
                    if (res.success && res.user) {
                      setUser(res.user);
                      window.location.reload();
                    }
                  }}
                  className="py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                >
                  As @Sanvi850
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await loginWithServer('panchadip125');
                    if (res.success && res.user) {
                      setUser(res.user);
                      window.location.reload();
                    }
                  }}
                  className="py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                >
                  As @panchadip125
                </button>
              </div>

              <Link
                href="/"
                className="block w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium text-xs rounded transition-colors mt-2"
              >
                ← Return to Main Calendar
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b0e] text-zinc-200 font-mono flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Terminal Header */}
        <div className="p-5 rounded-xl bg-[#0d1319] border border-violet-500/50 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-violet-500/20 text-violet-400 border border-violet-500/50">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-violet-300">
                    // ADMIN_ANALYTICS_&_ROLE_CONTROL
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-violet-950 text-violet-300 border border-violet-500/60">
                    SERVER_ENFORCED
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Single authorization system: Server DB roles (user | moderator | admin) with audit logging.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/pipeline-logs"
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Audit Logs ({logs.length})</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Role Management Tool (Problem 8) */}
        <div className="p-5 rounded-xl bg-[#0b1016] border border-zinc-800 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <UserCog className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
              // ROLE_BASED_ACCESS_MANAGEMENT
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mb-3">
            Promote or demote users in the database. Role updates are server-enforced and logged to <code>role_audit_logs</code>.
          </p>

          <form onSubmit={handleUpdateRole} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-6">
              <input
                type="text"
                placeholder="User ID or Email (e.g. user@example.com)"
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
                className="w-full bg-[#080c10] border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div className="sm:col-span-3">
              <select
                value={targetRole}
                onChange={e => setTargetRole(e.target.value as UserRole)}
                className="w-full bg-[#080c10] border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="user">User (Standard)</option>
                <option value="moderator">Moderator (Review queue)</option>
                <option value="admin">Admin (Full access)</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 font-bold text-xs rounded transition-colors"
              >
                Update Role
              </button>
            </div>
          </form>

          {roleMessage && (
            <div className="mt-2 text-xs text-emerald-400 p-2 bg-emerald-950/40 border border-emerald-500/50 rounded">
              {roleMessage}
            </div>
          )}
        </div>

        {/* Aggregated Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-[#0b1016] border border-zinc-800">
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Published Items</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{opportunities.length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Live in public calendar</div>
          </div>

          <div className="p-4 rounded-xl bg-[#0b1016] border border-zinc-800">
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Jobs Tracked</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">{typeDistribution.job || 0}</div>
            <div className="text-[11px] text-zinc-500 mt-1">JPMC, Samsung, etc.</div>
          </div>

          <div className="p-4 rounded-xl bg-[#0b1016] border border-zinc-800">
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Pipeline Runs</div>
            <div className="text-2xl font-bold text-violet-400 mt-1">{logs.length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">{pipelineMetrics.totalAdded} added across runs</div>
          </div>

          <div className="p-4 rounded-xl bg-[#0b1016] border border-zinc-800">
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">User Stars & Attends</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{starredTotal + attendingTotal}</div>
            <div className="text-[11px] text-zinc-500 mt-1">{starredTotal} starred, {attendingTotal} attending</div>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="p-5 rounded-xl bg-[#0b1016] border border-zinc-800 shadow-md">
          <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-4">
            // OPPORTUNITY_DISTRIBUTION_BY_CATEGORY
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(typeDistribution).map(([cat, count]) => (
              <div key={cat} className="p-3 bg-zinc-950 rounded border border-zinc-800/80">
                <span className="text-[10px] uppercase text-zinc-500 font-bold">{cat}</span>
                <div className="text-lg font-bold text-zinc-200 mt-0.5">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
