'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Terminal, Calendar, AlertCircle, History, RefreshCw, Star } from 'lucide-react';

interface NavbarProps {
  onTriggerPipeline?: () => void;
  isRunningPipeline?: boolean;
}

export default function Navbar({ onTriggerPipeline, isRunningPipeline }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-[#080d12]/90 backdrop-blur-md border-b border-zinc-800 font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Terminal prompt brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 group">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-sm sm:text-base">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>tanay@techradar:~$</span>
                <span className="terminal-cursor" />
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-1 sm:space-x-2 text-xs">
            <Link
              href="/"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded transition-colors border ${
                pathname === '/'
                  ? 'bg-zinc-800 text-emerald-400 border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>/calendar</span>
            </Link>

            <Link
              href="/needs-review"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded transition-colors border ${
                pathname === '/needs-review'
                  ? 'bg-amber-950/40 text-amber-300 border-amber-500/50'
                  : 'text-zinc-400 hover:text-amber-300 border-transparent hover:bg-zinc-900'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>/review</span>
            </Link>

            <Link
              href="/pipeline-logs"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded transition-colors border ${
                pathname === '/pipeline-logs'
                  ? 'bg-zinc-800 text-cyan-400 border-cyan-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">/pipeline-logs</span>
            </Link>

            {onTriggerPipeline && (
              <button
                onClick={onTriggerPipeline}
                disabled={isRunningPipeline}
                className="ml-1 sm:ml-2 flex items-center space-x-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold transition-all disabled:opacity-50"
                title="Run web discovery pipeline"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningPipeline ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isRunningPipeline ? 'RUNNING...' : 'DISCOVER_NOW'}</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
