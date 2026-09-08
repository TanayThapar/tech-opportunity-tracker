'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { PipelineRunLog } from '@/types';
import { History, RefreshCw, CheckCircle, AlertTriangle, XCircle, ArrowLeft, Terminal } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { motion } from 'motion/react';

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
    <div className="min-h-screen bg-[#070b0e] text-zinc-200 font-mono flex flex-col">
      <Navbar onTriggerPipeline={triggerRun} isRunningPipeline={isTriggering} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-5">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>&lt;- cd .. (return to calendar)</span>
          </Link>
        </div>

        {/* Terminal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0d1319] border border-cyan-500/50 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-cyan-300">
                // SYSTEM_AUDIT_LOGS: DISCOVERY_RUNS
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Inspect cron cycles, new opportunities added, fuzzy deduplications, and archived past events.
              </p>
            </div>
          </div>

          <button
            onClick={triggerRun}
            disabled={isTriggering}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTriggering ? 'animate-spin' : ''}`} />
            <span>{isTriggering ? 'RUNNING_CYCLE...' : 'EXECUTE_CYCLE'}</span>
          </button>
        </div>

        {/* Logs stream */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mb-2 text-cyan-400" />
            <p>// Reading log stream...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center bg-[#090e13] rounded-xl border border-zinc-800 p-8">
            <p className="text-xs text-zinc-500">// No log records found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => {
              const runDate = parseISO(log.timestamp);
              const isSuccess = log.status === 'success';

              return (
                <div
                  key={log.id}
                  className="p-4 bg-[#090e13] rounded-xl border border-zinc-800 text-xs space-y-3 font-mono"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      {isSuccess ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/60">
                          <CheckCircle className="w-3 h-3" />
                          STATUS: 200 OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950/60 text-rose-300 border border-rose-500/60">
                          <XCircle className="w-3 h-3" />
                          STATUS: 500 ERR
                        </span>
                      )}
                      <span className="text-zinc-500">RUN_ID: {log.id}</span>
                    </div>

                    <span className="text-zinc-400">
                      {format(runDate, 'yyyy-MM-dd HH:mm:ss')} UTC
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                      <div className="font-bold text-zinc-200">{log.events_scanned}</div>
                      <div className="text-[10px] text-zinc-500">SCANNED</div>
                    </div>
                    <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/40 text-emerald-300">
                      <div className="font-bold">+{log.events_added}</div>
                      <div className="text-[10px]">ADDED</div>
                    </div>
                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                      <div className="font-bold text-zinc-200">{log.duplicates_skipped}</div>
                      <div className="text-[10px] text-zinc-500">FUZZY SKIPPED</div>
                    </div>
                    <div className="p-2 rounded bg-amber-950/30 border border-amber-500/40 text-amber-300">
                      <div className="font-bold">{log.low_confidence_count}</div>
                      <div className="text-[10px]">NEEDS REVIEW</div>
                    </div>
                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                      <div className="font-bold text-zinc-200">{log.events_archived}</div>
                      <div className="text-[10px] text-zinc-500">ARCHIVED</div>
                    </div>
                  </div>

                  {/* Details */}
                  {log.details && (
                    <div className="pt-2 text-[11px] space-y-1.5 border-t border-zinc-800/80 text-zinc-400">
                      {log.details.added_titles && log.details.added_titles.length > 0 && (
                        <div>
                          <span className="text-emerald-400 font-bold">&gt; NEW_ENTRIES:</span>
                          <ul className="list-disc list-inside mt-0.5 text-zinc-300 pl-2 space-y-0.5">
                            {log.details.added_titles.map((t, idx) => (
                              <li key={idx} className="truncate">{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {log.details.skipped_titles && log.details.skipped_titles.length > 0 && (
                        <div className="pt-1">
                          <span className="text-zinc-500 font-bold">&gt; FUZZY_DUPLICATES_DROPPED:</span>
                          <ul className="list-disc list-inside mt-0.5 text-zinc-500 pl-2 space-y-0.5">
                            {log.details.skipped_titles.map((t, idx) => (
                              <li key={idx} className="truncate">{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {log.errors && log.errors.length > 0 && (
                    <div className="p-2.5 bg-rose-950/40 border border-rose-500/50 rounded text-rose-300 text-[11px]">
                      <div className="font-bold mb-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>ERRORS:</span>
                      </div>
                      <ul className="list-disc list-inside">
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
