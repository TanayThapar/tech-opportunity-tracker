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
  Briefcase,
  AlertTriangle,
} from 'lucide-react';
import { getCurrentUser, logout, isDemoMode, fetchCurrentUser } from '@/lib/auth';
import { UserProfile } from '@/types/auth';
import { TechOpportunity } from '@/types';
import { getApproachingReminders, getReminderLabel, getReminderTypeLabel, ReminderAlert } from '@/lib/reminders';
import { format, parseISO } from 'date-fns';

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

  const handleLogout = () => {
    logout();
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
        <div className="bg-amber-950/90 border-b border-amber-500/50 text-amber-200 text-xs py-1 px-4 text-center font-mono flex items-center justify-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>LOCAL DEMO MODE (Read-only sandbox, no server/production database access)</span>
        </div>
      )}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Brand */}
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-sm">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-sm hidden sm:block">
                  TechRadar
                </span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-1 text-xs">
              <Link
                href="/"
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  pathname === '/'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </Link>

              {isModeratorOrAdmin && (
                <Link
                  href="/needs-review"
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                    pathname === '/needs-review'
                      ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Review</span>
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/pipeline-logs"
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                    pathname === '/pipeline-logs'
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
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
                      ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Admin</span>
                </Link>
              )}
            </nav>

            {/* Right side: Pipeline, Reminders, User */}
            <div className="flex items-center gap-2">
              {/* Run Pipeline (Admin only) */}
              {isAdmin && onTriggerPipeline && (
                <button
                  onClick={onTriggerPipeline}
                  disabled={isRunningPipeline}
                  title="Run discovery pipeline"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRunningPipeline ? 'animate-spin' : ''}`} />
                  <span className="hidden lg:inline">{isRunningPipeline ? 'Running...' : 'Refresh'}</span>
                </button>
              )}

              {/* 🔔 Reminder Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowReminderTray(!showReminderTray)}
                  className={`relative p-2 rounded-lg transition-colors ${
                    totalCount > 0
                      ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/40'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="Upcoming reminders"
                >
                  <Bell className="w-4 h-4" />
                  {totalCount > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-black text-white
                      ${criticalCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}>
                      {totalCount}
                    </span>
                  )}
                </button>

                {/* Reminder Tray Dropdown */}
                {showReminderTray && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming Reminders</span>
                      </div>
                      <button onClick={() => setShowReminderTray(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>

                    {reminders.length === 0 ? (
                      <div className="p-6 text-center">
                        <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No upcoming reminders</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Mark events as &quot;Attending&quot; or enable reminders on events you&apos;re tracking.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700/60 max-h-[400px] overflow-y-auto">
                        {reminders.map((alert, i) => (
                          <div key={i} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                                  {getReminderTypeLabel(alert.type)}
                                </span>
                                <h4 className="text-xs font-semibold text-gray-900 dark:text-white mt-1 line-clamp-1">
                                  {alert.eventTitle}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                  <Clock className="w-3 h-3 text-orange-500" />
                                  <span>{getReminderLabel(alert)}</span>
                                </div>
                              </div>
                              <a
                                href={alert.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-blue-500 p-1"
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
                <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[120px]">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                      [{user.role}]
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
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
