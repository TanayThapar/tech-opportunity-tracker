'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { PipelineRunLog } from '@/types';
import { History, RefreshCw, CheckCircle, AlertTriangle, XCircle, ArrowLeft, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

export default function PipelineLogsPage() {
  const [logs, setLogs] = useState<PipelineRunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pipeline/logs');
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
      }
    } catch (err) {
      console.error('Failed fetching pipeline logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const triggerRun = async () => {
    try {
      setIsTriggering(true);
      const res = await fetch('/api/pipeline/run', { method: 'POST' });
      await res.json();
      await fetchLogs();
    } catch (err) {
      console.error('Trigger error:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      <Navbar onTriggerPipeline={triggerRun} isRunningPipeline={isTriggering} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Public Calendar & Feed</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Discovery Pipeline Audit Logs
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Inspect automated runs, new additions, fuzzy duplicates skipped, and expired events archived.
              </p>
            </div>
          </div>

          <button
            onClick={triggerRun}
            disabled={isTriggering}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isTriggering ? 'animate-spin' : ''}`} />
            <span>{isTriggering ? 'Running Pipeline...' : 'Run Pipeline Now'}</span>
          </button>
        </div>

        {/* Logs Table / List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400">
            <RefreshCw className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs">Loading audit trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
            <p className="text-sm text-zinc-500">No pipeline runs recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map(log => {
              const runDate = parseISO(log.timestamp);
              const isSuccess = log.status === 'success';

              return (
                <div
                  key={log.id}
                  className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      {isSuccess ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                          <XCircle className="w-3.5 h-3.5" />
                          Failed
                        </span>
                      )}
                      <span className="text-xs font-mono text-zinc-400">ID: {log.id}</span>
                    </div>

                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      {format(runDate, 'MMMM d, yyyy • HH:mm:ss')}
                    </span>
                  </div>

                  {/* Summary Metric Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-1 text-center">
                    <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="text-base sm:text-lg font-bold text-zinc-800 dark:text-zinc-200">
                        {log.events_scanned}
                      </div>
                      <div className="text-[11px] text-zinc-500">Scanned</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                      <div className="text-base sm:text-lg font-bold">+{log.events_added}</div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Added</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="text-base sm:text-lg font-bold text-zinc-800 dark:text-zinc-200">
                        {log.duplicates_skipped}
                      </div>
                      <div className="text-[11px] text-zinc-500">Duplicates Skipped</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
                      <div className="text-base sm:text-lg font-bold">{log.low_confidence_count}</div>
                      <div className="text-[11px] text-amber-600 dark:text-amber-400">Needs Review</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="text-base sm:text-lg font-bold text-zinc-800 dark:text-zinc-200">
                        {log.events_archived}
                      </div>
                      <div className="text-[11px] text-zinc-500">Auto-Archived</div>
                    </div>
                  </div>

                  {/* Details of newly added & skipped */}
                  {log.details && (
                    <div className="pt-2 text-xs space-y-2 border-t border-zinc-100 dark:border-zinc-800/80">
                      {log.details.added_titles && log.details.added_titles.length > 0 && (
                        <div>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            Newly added events:
                          </span>
                          <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 mt-1 pl-1 space-y-0.5">
                            {log.details.added_titles.map((t, idx) => (
                              <li key={idx} className="truncate">
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {log.details.skipped_titles && log.details.skipped_titles.length > 0 && (
                        <div className="pt-1">
                          <span className="font-semibold text-zinc-500">
                            Fuzzy duplicates skipped:
                          </span>
                          <ul className="list-disc list-inside text-zinc-500 mt-1 pl-1 space-y-0.5">
                            {log.details.skipped_titles.map((t, idx) => (
                              <li key={idx} className="truncate">
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Errors if any */}
                  {log.errors && log.errors.length > 0 && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-xs text-rose-800 dark:text-rose-300">
                      <div className="font-semibold mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Errors encountered:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5">
                        {log.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
