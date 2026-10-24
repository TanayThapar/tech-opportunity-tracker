'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { PipelineRunLog } from '@/types';
import { History, RefreshCw, CheckCircle, AlertTriangle, XCircle, ArrowLeft, Terminal, Activity } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { getAuthHeaders } from '@/lib/auth';

export default function PipelineLogsPage() {
  const [logs, setLogs] = useState<PipelineRunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pipeline/logs', { headers: getAuthHeaders() });
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
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      await res.json();
      await fetchLogs();
    } catch (err) {
      console.error('Trigger error:', err);
    } finally {
      setIsTriggering(false);
    }
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
            <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">
                Crawler & Ingestion Pipeline Audit Logs
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Detailed run metrics, rate limit status, duplicate resolutions, and error traces.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Logs List */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-mono">
            Loading run logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-[#111620] border border-slate-800">
            <h3 className="text-sm font-bold text-white">No Pipeline Runs Recorded Yet</h3>
            <p className="text-xs text-slate-400 mt-1">
              Trigger a manual run or await the scheduled cron job.
            </p>
          </div>
        ) : (
          <div className="space-y-3 font-mono">
            {logs.map(log => {
              const dateStr = log.timestamp ? format(parseISO(log.timestamp), 'yyyy-MM-dd HH:mm:ss') : 'Unknown';
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
      </main>
    </div>
  );
}
