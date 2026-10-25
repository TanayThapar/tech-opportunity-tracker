'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import { PipelineRunLog, SystemAuditLog, AuditLogCategory } from '@/types';
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Activity,
  ShieldCheck,
  UserX,
  Trash2,
  UserCog,
  LogIn,
  LogOut,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  KeyRound,
  ShieldAlert,
  Clock,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { getAuthHeaders } from '@/lib/auth';
import { useSearchParams } from 'next/navigation';

function PipelineLogsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'pipeline' ? 'pipeline' : 'audit';

  const [activeTab, setActiveTab] = useState<'audit' | 'pipeline'>(initialTab);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [pipelineLogs, setPipelineLogs] = useState<PipelineRunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);

  // Audit Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs?limit=250', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAuditLogs(json.data);
      }
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    }
  };

  const fetchPipelineLogs = async () => {
    try {
      const res = await fetch('/api/pipeline/logs', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPipelineLogs(json.data);
      }
    } catch (err) {
      console.warn('Failed to load pipeline logs:', err);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchAuditLogs(), fetchPipelineLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const triggerRun = async () => {
    try {
      setIsTriggering(true);
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      await res.json();
      await refreshAll();
    } catch (err) {
      console.error('Trigger error:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedLogIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedLogIds(next);
  };

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (selectedCategory !== 'all' && log.category !== selectedCategory) return false;
      if (selectedStatus !== 'all' && log.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDesc = log.description?.toLowerCase().includes(q);
        const matchesAction = log.action?.toLowerCase().includes(q);
        const matchesActor =
          log.actor?.handle?.toLowerCase().includes(q) || log.actor?.email?.toLowerCase().includes(q);
        const matchesTarget = log.target?.label?.toLowerCase().includes(q);
        if (!matchesDesc && !matchesAction && !matchesActor && !matchesTarget) {
          return false;
        }
      }
      return true;
    });
  }, [auditLogs, selectedCategory, selectedStatus, searchQuery]);

  const getActionBadge = (action: string, status: string) => {
    if (action === 'AUTH_ROOT_LOGIN') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500/50 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-purple-400" />
          ROOT LOGIN
        </span>
      );
    }
    if (action === 'ADMIN_ACCOUNT_REVOKED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500/50 flex items-center gap-1">
          <UserX className="w-3 h-3 text-rose-400" />
          ACCESS REVOKED
        </span>
      );
    }
    if (action === 'ADMIN_ACCOUNT_RESTORED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/50 flex items-center gap-1">
          <UserCheck className="w-3 h-3 text-emerald-400" />
          ACCESS RESTORED
        </span>
      );
    }
    if (action === 'ADMIN_ACCOUNT_ERASED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500/50 flex items-center gap-1">
          <Trash2 className="w-3 h-3 text-rose-400" />
          ACCOUNT ERASED
        </span>
      );
    }
    if (action === 'ADMIN_ROLE_CHANGE') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/50 flex items-center gap-1">
          <UserCog className="w-3 h-3 text-amber-400" />
          ROLE UPDATED
        </span>
      );
    }
    if (action === 'AUTH_LOGIN_SUCCESS') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-lime-950 text-lime-300 border border-lime-500/40 flex items-center gap-1">
          <LogIn className="w-3 h-3 text-lime-400" />
          LOGIN OK
        </span>
      );
    }
    if (action === 'AUTH_LOGIN_FAILED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500/50 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          LOGIN BLOCKED
        </span>
      );
    }
    if (action === 'AUTH_OTP_VERIFIED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-lime-950 text-lime-300 border border-lime-500/40 flex items-center gap-1">
          <KeyRound className="w-3 h-3 text-lime-400" />
          OTP VERIFIED
        </span>
      );
    }
    if (action === 'AUTH_OTP_FAILED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500/40 flex items-center gap-1">
          <KeyRound className="w-3 h-3 text-rose-400" />
          OTP INVALID
        </span>
      );
    }
    if (action === 'AUTH_SIGNUP_REQUEST' || action === 'AUTH_OTP_RESENT') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-500/40 flex items-center gap-1">
          <KeyRound className="w-3 h-3 text-blue-400" />
          OTP DISPATCHED
        </span>
      );
    }
    if (action === 'AUTH_LOGOUT') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-slate-400 border border-slate-700 flex items-center gap-1">
          <LogOut className="w-3 h-3 text-slate-400" />
          LOGOUT
        </span>
      );
    }
    if (action === 'OPPORTUNITY_APPROVED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          APPROVED
        </span>
      );
    }
    if (action === 'OPPORTUNITY_SUBMITTED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/40 flex items-center gap-1">
          <FileText className="w-3 h-3 text-amber-400" />
          SUBMITTED
        </span>
      );
    }
    if (action === 'PIPELINE_RUN_COMPLETED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
          <Activity className="w-3 h-3 text-cyan-400" />
          PIPELINE RUN
        </span>
      );
    }
    if (action === 'AI_EXTRACTION_SUCCESS') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500/40 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-purple-400" />
          AI EXTRACTION
        </span>
      );
    }

    // Default badge
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-900 text-slate-300 border border-slate-700">
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0c1015] text-[#e6edf3] font-sans flex flex-col">
      <Navbar onTriggerPipeline={triggerRun} isRunningPipeline={isTriggering} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-5">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-lime-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Return to Opportunity Radar</span>
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#111620] border border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">
                System Activity & Pipeline Audit Logs
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time chronological audit trail of all security, authentication, administrative, and crawler actions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshAll}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </button>
            <button
              onClick={triggerRun}
              disabled={isTriggering}
              className="px-3.5 py-1.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTriggering ? 'animate-spin' : ''}`} />
              <span>{isTriggering ? 'Crawling...' : 'Trigger Pipeline'}</span>
            </button>
          </div>
        </div>

        {/* Top View Selector Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>System Activity & Audit Trail</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
              {auditLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'pipeline'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Crawler Pipeline Runs</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
              {pipelineLogs.length}
            </span>
          </button>
        </div>

        {/* TAB 1: System Audit Logs */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 rounded-xl bg-[#111620] border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search logs by action, username, email, or description..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0c1015] border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  Showing <span className="text-white font-bold">{filteredAuditLogs.length}</span> of {auditLogs.length} events
                </div>
              </div>

              {/* Category Filters */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <span className="text-slate-500 font-semibold mr-1 text-[11px] uppercase">Category:</span>
                {[
                  { id: 'all', label: 'All Actions' },
                  { id: 'admin', label: 'Admin & Role Changes' },
                  { id: 'auth', label: 'Auth & OTP' },
                  { id: 'security', label: 'Security & Root' },
                  { id: 'pipeline', label: 'Pipeline & AI' },
                  { id: 'content', label: 'Submissions' },
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      selectedCategory === c.id
                        ? 'bg-lime-400 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Log Stream */}
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 font-mono">
                Loading audit trail...
              </div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="p-12 text-center rounded-xl bg-[#111620] border border-slate-800 space-y-2">
                <Activity className="w-8 h-8 mx-auto text-slate-500" />
                <h3 className="text-sm font-bold text-white">No Matching Audit Events Found</h3>
                <p className="text-xs text-slate-400">
                  {searchQuery ? 'Try clearing your search query or filters.' : 'Actions taken in the system will automatically appear here.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-[#111620] overflow-hidden shadow-sm">
                {filteredAuditLogs.map(log => {
                  const dateStr = log.timestamp
                    ? format(parseISO(log.timestamp), 'yyyy-MM-dd HH:mm:ss')
                    : 'Unknown';
                  const isExpanded = expandedLogIds.has(log.id);
                  const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 hover:bg-slate-900/40 transition-colors text-xs space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getActionBadge(log.action, log.status)}
                          <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {dateStr}
                          </span>
                        </div>

                        {/* Actor pill */}
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-slate-500">Actor:</span>
                          <span className="text-white font-semibold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {log.actor.handle ? `@${log.actor.handle}` : log.actor.email || 'System'}
                            {log.actor.role && (
                              <span className="text-lime-400 ml-1 text-[10px]">[{log.actor.role}]</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Description & Target */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="text-slate-200 font-sans leading-relaxed">
                          {log.description}
                          {log.target && (
                            <span className="ml-1.5 text-slate-400 font-mono text-[11px]">
                              → Target: <strong className="text-white">{log.target.label || log.target.id}</strong>
                            </span>
                          )}
                        </div>

                        {hasMeta && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(log.id)}
                            className="text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 text-[11px] font-mono flex items-center gap-1"
                          >
                            <span>{isExpanded ? 'Hide Details' : 'Details'}</span>
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>

                      {/* Expandable Metadata JSON Drawer */}
                      {isExpanded && hasMeta && (
                        <div className="mt-2 p-3 rounded-lg bg-[#0c1015] border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Crawler Pipeline Runs */}
        {activeTab === 'pipeline' && (
          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 font-mono">
                Loading run logs...
              </div>
            ) : pipelineLogs.length === 0 ? (
              <div className="p-12 text-center rounded-xl bg-[#111620] border border-slate-800">
                <h3 className="text-sm font-bold text-white">No Pipeline Runs Recorded Yet</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Trigger a manual run or await the scheduled cron job.
                </p>
              </div>
            ) : (
              <div className="space-y-3 font-mono">
                {pipelineLogs.map(log => {
                  const dateStr = log.timestamp
                    ? format(parseISO(log.timestamp), 'yyyy-MM-dd HH:mm:ss')
                    : 'Unknown';
                  const isSuccess = log.status === 'success';
                  const isRunning = log.status === 'running';

                  return (
                    <div
                      key={log.id}
                      className="p-4 rounded-xl bg-[#111620] border border-slate-800 space-y-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isSuccess && <CheckCircle className="w-4 h-4 text-lime-400" />}
                          {isRunning && <AlertTriangle className="w-4 h-4 text-amber-400 animate-spin" />}
                          {!isSuccess && !isRunning && <XCircle className="w-4 h-4 text-rose-400" />}
                          <span className="font-bold text-white">{log.id}</span>
                          <span className="text-slate-400">({dateStr})</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isSuccess
                              ? 'bg-lime-950 text-lime-300 border border-lime-500/30'
                              : isRunning
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                        <div className="p-2 bg-[#0c1015] rounded border border-slate-800">
                          <span className="text-slate-400">Scanned: </span>
                          <span className="text-white font-bold">{log.events_scanned}</span>
                        </div>
                        <div className="p-2 bg-[#0c1015] rounded border border-slate-800">
                          <span className="text-slate-400">Added: </span>
                          <span className="text-lime-400 font-bold">+{log.events_added}</span>
                        </div>
                        <div className="p-2 bg-[#0c1015] rounded border border-slate-800">
                          <span className="text-slate-400">Skipped (Dup): </span>
                          <span className="text-slate-400 font-bold">{log.duplicates_skipped}</span>
                        </div>
                        <div className="p-2 bg-[#0c1015] rounded border border-slate-800">
                          <span className="text-slate-400">Quarantined: </span>
                          <span className="text-amber-400 font-bold">{log.low_confidence_count}</span>
                        </div>
                        <div className="p-2 bg-[#0c1015] rounded border border-slate-800">
                          <span className="text-slate-400">Archived: </span>
                          <span className="text-slate-500 font-bold">{log.events_archived}</span>
                        </div>
                      </div>

                      {log.errors && log.errors.length > 0 && (
                        <div className="p-2.5 rounded bg-rose-950/30 border border-rose-500/30 text-rose-300 space-y-1">
                          <div className="font-bold text-[11px] uppercase">Errors / Warnings:</div>
                          {log.errors.map((err, i) => (
                            <div key={i} className="text-[11px] leading-relaxed">
                              • {err}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function PipelineLogsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c1015] text-[#e6edf3] p-8 text-center font-mono text-xs">Loading logs...</div>}>
      <PipelineLogsContent />
    </Suspense>
  );
}
