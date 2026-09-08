'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Calendar, AlertCircle, History, RefreshCw } from 'lucide-react';

interface NavbarProps {
  onTriggerPipeline?: () => void;
  isRunningPipeline?: boolean;
}

export default function Navbar({ onTriggerPipeline, isRunningPipeline }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5">
                  TechRadar <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 font-medium">Auto-Discovered</span>
                </span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                  Conferences, Hackathons, Internships & Workshops
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <Link
              href="/"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Calendar & Feed</span>
            </Link>

            <Link
              href="/needs-review"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/needs-review'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-zinc-900'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="flex items-center gap-1">
                Needs Review
              </span>
            </Link>

            <Link
              href="/pipeline-logs"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/pipeline-logs'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              <History className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline">Discovery Logs</span>
            </Link>

            {onTriggerPipeline && (
              <button
                onClick={onTriggerPipeline}
                disabled={isRunningPipeline}
                className="ml-2 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Run discovery pipeline immediately"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningPipeline ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{isRunningPipeline ? 'Discovering...' : 'Run Pipeline'}</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
