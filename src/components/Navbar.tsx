'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calendar,
  AlertCircle,
  History,
  RefreshCw,
  LogOut,
  Shield,
  LogIn,
  Bell,
  X,
  ExternalLink,
  Clock,
  Radio,
  ShieldAlert,
} from 'lucide-react';
import { getCurrentUser, logoutWithServer, isDemoMode, fetchCurrentUser } from '@/lib/auth';
import { UserProfile } from '@/types/auth';
import { TechOpportunity } from '@/types';
import { getApproachingReminders, getReminderLabel, getReminderTypeLabel, ReminderAlert } from '@/lib/reminders';

interface NavbarProps {
  onTriggerPipeline?: () => void;
  isRunningPipeline?: boolean;
  opportunities?: TechOpportunity[];
}

const EMPTY_OPPORTUNITIES: TechOpportunity[] = [];

export default function Navbar({ onTriggerPipeline, isRunningPipeline, opportunities = EMPTY_OPPORTUNITIES }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showReminderTray, setShowReminderTray] = useState(false);
  const [reminders, setReminders] = useState<ReminderAlert[]>([]);

  const syncUser = () => {
    setUser(getCurrentUser());
    fetchCurrentUser().then(u => {
      if (u) setUser(u);
    });
  };

  useEffect(() => {
    syncUser();
    window.addEventListener('techradar_auth_change', syncUser);
    return () => window.removeEventListener('techradar_auth_change', syncUser);
  }, []);

  const opportunitiesRef = React.useRef<TechOpportunity[]>(opportunities);

  useEffect(() => {
    opportunitiesRef.current = opportunities;
    setReminders(getApproachingReminders(opportunities));
  }, [opportunities]);

  useEffect(() => {
    const update = () => setReminders(getApproachingReminders(opportunitiesRef.current));
    window.addEventListener('techradar_interaction_change', update);
    return () => window.removeEventListener('techradar_interaction_change', update);
  }, []);

  const handleLogout = async () => {
    await logoutWithServer();
    router.push('/login');
  };

  const isAdmin = user?.role === 'admin';
  const isModeratorOrAdmin = user?.role === 'moderator' || user?.role === 'admin';
  const inDemo = isDemoMode();

  const criticalCount = reminders.filter(r => r.urgency === 'critical').length;
  const totalCount = reminders.length;

  return (
    <>
      {inDemo && (
        <div className="bg-amber-950/70 border-b border-amber-500/30 text-amber-300 text-[11px] py-1 px-4 text-center font-mono flex items-center justify-center gap-2">
          <span>// LOCAL DEMO ENVIRONMENT // Isolated test data</span>
        </div>
      )}
      <header className="sticky top-0 z-50 bg-[#0c1015]/95 backdrop-blur-md border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Brand */}
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-lime-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-lime-950/40">
                  <Radio className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
                    RADAR
                    <span className="text-[10px] font-mono px-1 py-0.2 bg-slate-800 text-slate-300 rounded">v2.5</span>
                  </span>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-1 text-xs">
              <Link
                href="/"
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  pathname === '/'
                    ? 'bg-lime-400/10 text-lime-400 border border-lime-400/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Radar</span>
              </Link>

              {/* Privileged navigation: strictly hidden unless user has moderator or admin role */}
              {isModeratorOrAdmin && (
                <Link
                  href="/needs-review"
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                    pathname === '/needs-review'
                      ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                      : 'text-slate-300 hover:text-amber-400 hover:bg-slate-800/60'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Review Queue</span>
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/pipeline-logs"
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                    pathname === '/pipeline-logs'
                      ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20'
                      : 'text-slate-300 hover:text-cyan-400 hover:bg-slate-800/60'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Logs</span>
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                    pathname === '/admin'
                      ? 'bg-purple-400/10 text-purple-400 border border-purple-400/20'
                      : 'text-slate-300 hover:text-purple-400 hover:bg-slate-800/60'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Admin</span>
                </Link>
              )}
            </nav>

            {/* Right side: Pipeline trigger, Reminders, User */}
            <div className="flex items-center gap-2">
              {/* Run Pipeline (Admin only) */}
              {isAdmin && onTriggerPipeline && (
                <button
                  onClick={onTriggerPipeline}
                  disabled={isRunningPipeline}
                  title="Run discovery pipeline"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRunningPipeline ? 'animate-spin text-lime-400' : ''}`} />
                  <span className="hidden lg:inline">{isRunningPipeline ? 'Syncing...' : 'Crawl'}</span>
                </button>
              )}

              {/* 🔔 Reminder Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowReminderTray(!showReminderTray)}
                  className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
                    totalCount > 0
                      ? 'text-amber-400 bg-amber-950/40 border border-amber-500/30 hover:bg-amber-900/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title="Upcoming reminders"
                >
                  <Bell className="w-4 h-4" />
                  {totalCount > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-mono font-bold text-slate-950
                      ${criticalCount > 0 ? 'bg-rose-400 animate-pulse' : 'bg-amber-400'}`}>
                      {totalCount}
                    </span>
                  )}
                </button>

                {/* Reminder Tray Dropdown */}
                {showReminderTray && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#111620] rounded-xl shadow-2xl border border-slate-800 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#0c1015]">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Upcoming Deadlines</span>
                      </div>
                      <button
                        onClick={() => setShowReminderTray(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {reminders.length === 0 ? (
                      <div className="p-6 text-center space-y-1">
                        <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-white font-medium">No urgent deadlines approaching</p>
                        <p className="text-[11px] text-slate-400">
                          Save opportunities or mark as attending to receive countdown alerts.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800 max-h-[400px] overflow-y-auto">
                        {reminders.map((alert, i) => (
                          <div key={i} className="p-3 hover:bg-slate-800/40 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-500/30">
                                  {getReminderTypeLabel(alert.type)}
                                </span>
                                <h4 className="text-xs font-semibold text-white mt-1 line-clamp-1">
                                  {alert.eventTitle}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mt-1">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>{getReminderLabel(alert)}</span>
                                </div>
                              </div>
                              <a
                                href={alert.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-lime-400 p-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User profile / login */}
              {user ? (
                <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-semibold text-white truncate max-w-[120px]">
                      {user.name}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-wider">
                      {user.role === 'admin' ? (
                        <span className="text-purple-400 font-bold">ADMIN</span>
                      ) : user.role === 'moderator' ? (
                        <span className="text-amber-400 font-bold">MODERATOR</span>
                      ) : (
                        <span className="text-slate-400">RESEARCHER</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1 px-3 py-1.5 bg-lime-400 hover:bg-lime-300 text-slate-950 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
