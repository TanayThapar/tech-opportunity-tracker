'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { TechOpportunity, PipelineRunLog, SystemAuditLog } from '@/types';
import { getCurrentUser, fetchCurrentUser, getAuthHeaders } from '@/lib/auth';
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
  ArrowLeft,
  Users,
  ShieldQuestion,
  Trash2,
  UserX,
  AlertTriangle,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { getAllInteractions } from '@/lib/interactions';

export default function AdminAnalyticsDashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [opportunities, setOpportunities] = useState<TechOpportunity[]>([]);
  const [logs, setLogs] = useState<PipelineRunLog[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Role management state
  const [targetUserId, setTargetUserId] = useState('');
  const [targetRole, setTargetRole] = useState<UserRole>('moderator');
  const [roleMessage, setRoleMessage] = useState<string | null>(null);
  const [customInputMode, setCustomInputMode] = useState(false);
  const [eraseTargetUser, setEraseTargetUser] = useState<UserProfile | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [recentAuditLogs, setRecentAuditLogs] = useState<SystemAuditLog[]>([]);

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs?limit=8', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRecentAuditLogs(json.data);
      }
    } catch (err) {
      console.warn('Failed to load recent audit logs:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/roles', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUsersList(json.data);
      }
    } catch (err) {
      console.warn('Failed to load users list:', err);
    }
  };

  useEffect(() => {
    const verifyAndFetch = async () => {
      try {
        setLoading(true);
        let u = getCurrentUser();
        const serverUser = await fetchCurrentUser();
        if (serverUser) {
          u = serverUser;
        }
        setUser(u);

        if (u?.role === 'admin') {
          const authHeaders = getAuthHeaders();
          const [oppsRes, logsRes, usersRes, auditRes] = await Promise.all([
            fetch('/api/opportunities?status=published', { headers: authHeaders }),
            fetch('/api/pipeline/logs', { headers: authHeaders }),
            fetch('/api/admin/roles', { headers: authHeaders }),
            fetch('/api/admin/audit-logs?limit=8', { headers: authHeaders }),
          ]);
          const oppsJson = await oppsRes.json();
          const logsJson = await logsRes.json();
          const usersJson = await usersRes.json();
          const auditJson = await auditRes.json();

          if (oppsJson.success) setOpportunities(oppsJson.data);
          if (logsJson.success) setLogs(logsJson.data);
          if (usersJson.success && Array.isArray(usersJson.data)) {
            setUsersList(usersJson.data);
          }
          if (auditJson.success && Array.isArray(auditJson.data)) {
            setRecentAuditLogs(auditJson.data);
          }
        }
      } catch (err) {
        console.error('Failed loading admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyAndFetch();
  }, []);

  const selectedProfile = useMemo(() => {
    return usersList.find(u => u.id === targetUserId || u.email === targetUserId || u.handle === targetUserId);
  }, [usersList, targetUserId]);

  const isSelectedRootAdmin = useMemo(() => {
    if (!selectedProfile && !targetUserId) return false;
    const identifier = (selectedProfile?.handle || selectedProfile?.email || targetUserId).toLowerCase().trim();
    return (
      identifier === 'tanaythapar' ||
      identifier === 'sanvi850' ||
      identifier.startsWith('tanaythapar@') ||
      identifier.startsWith('sanvi850@')
    );
  }, [selectedProfile, targetUserId]);

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) return;

    if (isSelectedRootAdmin) {
      setRoleMessage('Error: TanayThapar and Sanvi850 have the highest level of administrative access locked in source code and cannot be modified.');
      return;
    }

    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          targetUserId: targetUserId.trim(),
          newRole: targetRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRoleMessage(`Success: Role for user "${targetUserId}" updated to "${targetRole}"`);
        await Promise.all([fetchUsers(), fetchAuditLogs()]);
        setTimeout(() => setRoleMessage(null), 4000);
      } else {
        setRoleMessage(`Error: ${data.error || 'Failed to update user role'}`);
      }
    } catch (err: any) {
      setRoleMessage(`Error: ${err.message}`);
    }
  };

  const handleRevokeOrRestore = async (target: UserProfile) => {
    const isRoot =
      target.handle.toLowerCase() === 'tanaythapar' ||
      target.handle.toLowerCase() === 'sanvi850' ||
      target.email.toLowerCase().includes('tanaythapar') ||
      target.email.toLowerCase().includes('sanvi850');

    if (isRoot) {
      setRoleMessage('Error: Root administrators TanayThapar and Sanvi850 are locked in source code and cannot be revoked.');
      return;
    }

    if (target.id === user?.id || target.handle.toLowerCase() === user?.handle?.toLowerCase()) {
      setRoleMessage('Error: You cannot revoke your own active admin account.');
      return;
    }

    const nextRole: UserRole = target.role === 'revoked' ? 'user' : 'revoked';
    try {
      setIsActionLoading(true);
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          targetUserId: target.id,
          newRole: nextRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRoleMessage(`Success: User @${target.handle} access ${nextRole === 'revoked' ? 'revoked' : 'restored to user'}.`);
        await Promise.all([fetchUsers(), fetchAuditLogs()]);
        setTimeout(() => setRoleMessage(null), 4000);
      } else {
        setRoleMessage(`Error: ${data.error || 'Failed to update user access'}`);
      }
    } catch (err: any) {
      setRoleMessage(`Error: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmErase = async () => {
    if (!eraseTargetUser) return;
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/admin/roles?userId=${encodeURIComponent(eraseTargetUser.id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setRoleMessage(`Success: Account @${eraseTargetUser.handle} and all associated records permanently erased.`);
        setEraseTargetUser(null);
        await Promise.all([fetchUsers(), fetchAuditLogs()]);
        setTimeout(() => setRoleMessage(null), 4000);
      } else {
        setRoleMessage(`Error: ${data.error || 'Failed to erase account'}`);
      }
    } catch (err: any) {
      setRoleMessage(`Error: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const userInteractions = useMemo(() => {
    return getAllInteractions();
  }, []);

  const starredTotal = useMemo(() => {
    return Object.values(userInteractions).filter(i => i.starred).length;
  }, [userInteractions]);

  const attendingTotal = useMemo(() => {
    return Object.values(userInteractions).filter(i => i.participating).length;
  }, [userInteractions]);

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

  const isAuthorized = user && user.role === 'admin';

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0c1015] text-[#e6edf3] font-sans flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#111620] border border-amber-500/40 rounded-xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Administrator Authentication Required
            </h2>
            <div className="p-3 bg-[#0c1015] rounded-lg border border-slate-800 text-xs text-slate-400 text-left space-y-2">
              <div className="text-amber-400 font-semibold uppercase text-[11px]">Restricted Workspace:</div>
              <p className="leading-relaxed">
                The administrative dashboard and crawler controls are protected. Only accounts verified with server-side administrator privileges can access this area.
              </p>
              {user && (
                <div className="pt-2 text-slate-400 text-[11px] border-t border-slate-800">
                  Current session: <span className="text-white font-medium">@{user.handle}</span> (Role: <span className="text-amber-400 font-mono uppercase">{user.role}</span>)
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href="/login"
                className="block w-full py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-md"
              >
                Sign In with Admin Account
              </Link>
              <Link
                href="/"
                className="block w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium text-xs rounded-lg transition-colors"
              >
                ← Return to Opportunity Radar
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c1015] text-[#e6edf3] font-sans flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Header */}
        <div className="p-5 rounded-xl bg-[#111620] border border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-white">
                    Administrator Controls & Role Management
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-lime-950 text-lime-300 border border-lime-500/40">
                    HIGHEST ACCESS
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Active session: <span className="text-white font-semibold">@{user.handle}</span>. Root administrators TanayThapar and Sanvi850 are locked in source code.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/pipeline-logs"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5 text-lime-400" />
                <span>Pipeline Logs ({logs.length})</span>
              </Link>
              <Link
                href="/needs-review"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Review Queue</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Role-Based Access Management Tool with Dropdown Menu */}
        <div className="p-5 rounded-xl bg-[#111620] border border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-lime-400" />
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Role-Based Access Management
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select any registered user from the dropdown menu to assign roles (user, moderator, admin).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCustomInputMode(!customInputMode)}
              className="text-xs text-slate-400 hover:text-lime-400 transition-colors self-start sm:self-auto cursor-pointer"
            >
              {customInputMode ? '← Use Dropdown Menu' : 'Type Custom ID / Email →'}
            </button>
          </div>

          <form onSubmit={handleUpdateRole} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* User Selection: Dropdown Menu or Manual Input */}
              <div className="sm:col-span-6 space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  {customInputMode ? 'User ID or Email' : 'Select User from Dropdown Menu'}
                </label>

                {customInputMode ? (
                  <input
                    type="text"
                    placeholder="User ID or Email (e.g. user@example.com)"
                    value={targetUserId}
                    onChange={e => setTargetUserId(e.target.value)}
                    className="w-full bg-[#0c1015] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400 font-mono"
                  />
                ) : (
                  <select
                    value={targetUserId}
                    onChange={e => {
                      const val = e.target.value;
                      setTargetUserId(val);
                      const found = usersList.find(u => u.id === val || u.handle === val || u.email === val);
                      if (found) {
                        setTargetRole(found.role);
                      }
                    }}
                    className="w-full bg-[#0c1015] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400 cursor-pointer"
                  >
                    <option value="">-- Choose a registered user from dropdown --</option>
                    {usersList.map(u => {
                      const isRoot =
                        u.handle.toLowerCase() === 'tanaythapar' ||
                        u.handle.toLowerCase() === 'sanvi850' ||
                        u.email.toLowerCase().includes('tanaythapar') ||
                        u.email.toLowerCase().includes('sanvi850');
                      return (
                        <option key={u.id} value={u.id} className="bg-[#111620]">
                          @{u.handle} ({u.name} — {u.role.toUpperCase()}) {isRoot ? '★ [ROOT ADMIN]' : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Role Selection Dropdown */}
              <div className="sm:col-span-3 space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Assign Role
                </label>
                <select
                  disabled={isSelectedRootAdmin}
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value as UserRole)}
                  className={`w-full bg-[#0c1015] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400 font-mono ${
                    isSelectedRootAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <option value="user">User (Standard)</option>
                  <option value="moderator">Moderator (Review queue)</option>
                  <option value="admin">Admin (Full access)</option>
                  <option value="revoked" className="text-rose-400 font-bold">Revoked / Suspended (Blocked)</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={isSelectedRootAdmin || !targetUserId}
                  className="w-full py-2 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Update Role
                </button>
              </div>
            </div>

            {/* Root admin locked banner */}
            {isSelectedRootAdmin && (
              <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-500/50 text-purple-200 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  <strong>Highest Level of Access:</strong> @TanayThapar and @Sanvi850 are immutable root administrators defined permanently in source code. Their administrator privileges cannot be modified or revoked through the UI.
                </span>
              </div>
            )}

            {roleMessage && (
              <div
                className={`text-xs p-2.5 rounded-lg border ${
                  roleMessage.startsWith('Success')
                    ? 'bg-lime-950/40 border-lime-500/40 text-lime-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                {roleMessage}
              </div>
            )}
          </form>

          {/* Quick User List Table & Account Access Controls */}
          {usersList.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-1">
                <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
                  Registered User Accounts ({usersList.length})
                </span>
                <span className="text-[11px] text-slate-400">
                  Manage permissions, revoke login access, or completely erase user accounts
                </span>
              </div>

              <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-[#0c1015] overflow-hidden">
                {usersList.map(u => {
                  const isRoot =
                    u.handle.toLowerCase() === 'tanaythapar' ||
                    u.handle.toLowerCase() === 'sanvi850' ||
                    u.email.toLowerCase().includes('tanaythapar') ||
                    u.email.toLowerCase().includes('sanvi850');
                  const isSelf = u.id === user?.id || u.handle.toLowerCase() === user?.handle?.toLowerCase();
                  const isRevoked = u.role === 'revoked';

                  return (
                    <div
                      key={u.id}
                      className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        targetUserId === u.id ? 'bg-slate-800/40' : 'hover:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                          {u.name ? u.name.charAt(0).toUpperCase() : u.handle.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs truncate">@{u.handle}</span>
                            {isRoot ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500/50 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-purple-400" />
                                ROOT ADMIN
                              </span>
                            ) : isRevoked ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500/50 flex items-center gap-1">
                                <UserX className="w-3 h-3 text-rose-400" />
                                REVOKED
                              </span>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                  u.role === 'admin'
                                    ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                                    : u.role === 'moderator'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}
                              >
                                {u.role}
                              </span>
                            )}
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                            <span>{u.name}</span>
                            <span className="text-slate-600">•</span>
                            <span className="font-mono text-slate-400">{u.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Row Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setTargetUserId(u.id);
                            setTargetRole(u.role);
                            setCustomInputMode(false);
                          }}
                          className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                            targetUserId === u.id
                              ? 'bg-lime-400 text-slate-950 font-bold border-lime-400'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          Select
                        </button>

                        {!isRoot && !isSelf && (
                          <>
                            <button
                              type="button"
                              disabled={isActionLoading}
                              onClick={() => handleRevokeOrRestore(u)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                                isRevoked
                                  ? 'bg-emerald-950/60 hover:bg-emerald-900 border-emerald-500/50 text-emerald-300'
                                  : 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/40 text-amber-300'
                              }`}
                              title={isRevoked ? 'Restore account access' : 'Revoke and suspend account access'}
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>{isRevoked ? 'Restore' : 'Revoke'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={isActionLoading}
                              onClick={() => setEraseTargetUser(u)}
                              className="px-2.5 py-1 text-xs font-semibold rounded border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 transition-colors cursor-pointer flex items-center gap-1"
                              title="Completely erase user account and all data"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Erase</span>
                            </button>
                          </>
                        )}

                        {isRoot && (
                          <span className="text-[11px] text-purple-400 font-mono italic px-2">
                            Immutable Root
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Aggregated Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-[#111620] border border-slate-800">
            <div className="text-slate-400 text-[11px] uppercase font-bold tracking-wider">Published Items</div>
            <div className="text-2xl font-bold font-mono text-lime-400 mt-1">{opportunities.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Live in public radar</div>
          </div>

          <div className="p-4 rounded-xl bg-[#111620] border border-slate-800">
            <div className="text-slate-400 text-[11px] uppercase font-bold tracking-wider">Jobs & Internships</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {(typeDistribution.job || 0) + (typeDistribution.internship || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">JPMC, Samsung, Bloomberg</div>
          </div>

          <div className="p-4 rounded-xl bg-[#111620] border border-slate-800">
            <div className="text-slate-400 text-[11px] uppercase font-bold tracking-wider">Pipeline Runs</div>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{logs.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">{pipelineMetrics.totalAdded} added across runs</div>
          </div>

          <div className="p-4 rounded-xl bg-[#111620] border border-slate-800">
            <div className="text-slate-400 text-[11px] uppercase font-bold tracking-wider">User Watchlists</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">{starredTotal + attendingTotal}</div>
            <div className="text-[11px] text-slate-500 mt-1">{starredTotal} saved, {attendingTotal} attending</div>
          </div>
        </div>

        {/* Real-time System Audit & Action History Trail */}
        <div className="p-5 rounded-xl bg-[#111620] border border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-lime-400" />
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Action History & Security Audit Trail
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological event log of administrative interventions, authentication attempts, OTP verifications, and pipeline executions.
                </p>
              </div>
            </div>

            <Link
              href="/pipeline-logs?tab=audit"
              className="text-xs text-lime-400 hover:text-lime-300 font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Audit Log & Search ({recentAuditLogs.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentAuditLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-mono">
              No recent audit events recorded yet. Actions will automatically stream here.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-[#0c1015] overflow-hidden">
              {recentAuditLogs.map(log => {
                return (
                  <div
                    key={log.id}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                          log.action.includes('REVOKED') || log.action.includes('ERASED') || log.action.includes('FAILED')
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                            : log.action.includes('ROOT')
                            ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                            : log.action.includes('ROLE')
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : 'bg-lime-950 text-lime-300 border border-lime-500/40'
                        }`}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-200 truncate">{log.description}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono text-slate-400 self-end sm:self-auto">
                      <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                        {log.actor?.handle ? `@${log.actor.handle}` : log.actor?.email || 'System'}
                      </span>
                      <span className="text-slate-500">
                        {log.timestamp ? log.timestamp.slice(11, 19) : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="p-5 rounded-xl bg-[#111620] border border-slate-800 shadow-sm">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Opportunities by Category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(typeDistribution).map(([cat, count]) => (
              <div key={cat} className="p-3 bg-[#0c1015] rounded-lg border border-slate-800">
                <span className="text-[11px] uppercase text-slate-400 font-semibold">{cat}</span>
                <div className="text-xl font-bold font-mono text-white mt-0.5">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Erase Account Confirmation Modal */}
        {eraseTargetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="max-w-md w-full bg-[#111620] border border-rose-500/50 rounded-xl p-5 shadow-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Permanently Erase Account</h3>
                    <p className="text-xs text-rose-400">Irreversible administrative action</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEraseTargetUser(null)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-[#0c1015] rounded-lg border border-slate-800 text-xs space-y-2">
                <div className="text-slate-300">
                  You are about to completely erase the account for:
                </div>
                <div className="font-mono text-xs text-white font-bold bg-slate-900 p-2.5 rounded border border-slate-800">
                  @{eraseTargetUser.handle} ({eraseTargetUser.name})
                  <div className="text-xs text-slate-400 font-normal">{eraseTargetUser.email}</div>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Erasing this user permanently wipes their profile, email records, saved opportunities watchlist, notification preferences, and event interactions from the database.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={() => setEraseTargetUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={handleConfirmErase}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-950 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isActionLoading ? 'Erasing...' : 'Confirm Erase'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
