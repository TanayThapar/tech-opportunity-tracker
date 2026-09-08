'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Terminal,
  Calendar,
  AlertCircle,
  History,
  RefreshCw,
  LogOut,
  Shield,
  BarChart3,
  LogIn,
} from 'lucide-react';
import { getCurrentUser, logout, isWhitelistedAdmin } from '@/lib/auth';
import { UserProfile } from '@/types/auth';

interface NavbarProps {
  onTriggerPipeline?: () => void;
  isRunningPipeline?: boolean;
}

export default function Navbar({ onTriggerPipeline, isRunningPipeline }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);

  const syncUser = () => {
    setUser(getCurrentUser());
  };

  useEffect(() => {
    syncUser();
    window.addEventListener('techradar_auth_change', syncUser);
    return () => {
      window.removeEventListener('techradar_auth_change', syncUser);
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isWhitelisted = user && (isWhitelistedAdmin(user.handle) || isWhitelistedAdmin(user.email));

  return (
    <header className="sticky top-0 z-50 bg-[#080d12]/90 backdrop-blur-md border-b border-zinc-800 font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Terminal prompt brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 group">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-sm sm:text-base">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>{user ? user.handle.toLowerCase() : 'guest'}@techradar:~$</span>
                <span className="terminal-cursor" />
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-1 sm:space-x-2 text-xs">
            <Link
              href="/"
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded transition-colors border ${
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
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded transition-colors border ${
                pathname === '/needs-review'
                  ? 'bg-amber-950/40 text-amber-300 border-amber-500/50'
                  : 'text-zinc-400 hover:text-amber-300 border-transparent hover:bg-zinc-900'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">/review</span>
            </Link>

            <Link
              href="/pipeline-logs"
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded transition-colors border ${
                pathname === '/pipeline-logs'
                  ? 'bg-zinc-800 text-cyan-400 border-cyan-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">/logs</span>
            </Link>

            {/* Admin Backend tab - strictly styled & tagged */}
            {isWhitelisted ? (
              <Link
                href="/admin"
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded transition-all border shadow-sm ${
                  pathname === '/admin'
                    ? 'bg-purple-950 border-purple-500 text-purple-300 ring-1 ring-purple-500'
                    : 'bg-purple-950/40 border-purple-500/50 text-purple-300 hover:bg-purple-900/50'
                }`}
                title="Admin Visualizations & Analytics Backend"
              >
                <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-bold">/admin</span>
              </Link>
            ) : (
              <Link
                href="/admin"
                className="flex items-center space-x-1 px-2 py-1.5 rounded text-zinc-500 hover:text-purple-400 text-[11px]"
                title="Admin Backend (Whitelisted: TanayThapar, Sanvi850)"
              >
                <Shield className="w-3 h-3 text-zinc-500" />
                <span className="hidden lg:inline">/admin</span>
              </Link>
            )}

            {onTriggerPipeline && (
              <button
                onClick={onTriggerPipeline}
                disabled={isRunningPipeline}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold transition-all disabled:opacity-50"
                title="Run web discovery pipeline"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningPipeline ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isRunningPipeline ? 'RUNNING...' : 'DISCOVER'}</span>
              </button>
            )}

            {/* Auth status */}
            {user ? (
              <div className="flex items-center gap-1.5 pl-1">
                <span className="text-[11px] text-zinc-400 hidden sm:inline font-mono">
                  @{user.handle}
                </span>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                  title="Log out and return to login gate"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs border border-zinc-700 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>SIGN_IN</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
