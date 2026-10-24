'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { loginWithServer, signupWithServer, getCurrentUser, isDemoMode } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Terminal, Shield, User, ArrowRight, Lock, KeyRound, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const demoActive = isDemoMode();

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isSignUp) {
        const res = await signupWithServer(name, identifier);
        if (!res.success) {
          setError(res.error || 'Registration failed');
          return;
        }
        router.push('/');
      } else {
        const res = await loginWithServer(identifier);
        if (!res.success) {
          setError(res.error || 'Authentication failed');
          return;
        }
        // If an admin logs in, navigate directly to admin dashboard
        if (res.user?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAdminLogin = async (handle: string) => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await loginWithServer(handle);
      if (res.success) {
        router.push('/admin');
      } else {
        setError(res.error || 'Authentication failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b0e] text-zinc-200 font-mono flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-lg bg-[#0b1016] border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-5 relative overflow-hidden"
        >
          {demoActive && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-xs text-emerald-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">Alpha Testing Active</span>
                <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">
                  Testers and Administrators are organized into separated workspaces. Testers explore opportunities and live calendars; administrators control crawlers and review pipelines.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Terminal className="w-3.5 h-3.5" />
              <span>// RADAR_AUTH // ALPHA_GATEWAY</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isSignUp ? 'Create Alpha Tester Profile' : 'Alpha Tester Sign In'}
            </h1>
            <p className="text-xs text-zinc-400">
              {isSignUp
                ? 'Join alpha testing to track hackathons, conferences, jobs, and set personal deadline alerts.'
                : 'Access your tester calendar, starred listings, and attendance tracker.'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded bg-rose-950/40 border border-rose-500/60 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-[11px] text-zinc-400 uppercase tracking-wider mb-1">
                  Tester Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Chen"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] text-zinc-400 uppercase tracking-wider mb-1">
                Tester Handle or Email
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Tester1 or tester@example.com"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950 disabled:opacity-50"
            >
              <span>{isSignUp ? 'Register Tester Account' : 'Enter as Alpha Tester'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-1 text-center text-xs text-zinc-500">
            {isSignUp ? (
              <span>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-emerald-400 hover:underline font-bold"
                >
                  Sign in
                </button>
              </span>
            ) : (
              <span>
                New researcher?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-emerald-400 hover:underline font-bold"
                >
                  Create tester profile
                </button>
              </span>
            )}
          </div>

          {/* Quick-Access Server-Verified Admins - Separate Workspace */}
          <div className="pt-4 border-t border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-purple-400 font-bold">
                <Shield className="w-3.5 h-3.5" />
                <span>ADMINISTRATOR WORKSPACE (SEPARATED):</span>
              </span>
              <span className="text-[10px] text-zinc-400 bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.5 rounded uppercase font-semibold">
                Admin Console
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Separate administrative environment for crawler management, moderation queues, and database oversight.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickAdminLogin('TanayThapar')}
                className="py-2 px-2 bg-purple-950/50 hover:bg-purple-900/80 border border-purple-500/60 text-purple-200 rounded text-xs transition-all text-left flex items-center justify-between cursor-pointer disabled:opacity-50"
              >
                <div className="truncate">
                  <div className="font-bold truncate text-white">@TanayThapar</div>
                  <div className="text-[9px] text-purple-400">Lead Admin</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickAdminLogin('Sanvi850')}
                className="py-2 px-2 bg-purple-950/50 hover:bg-purple-900/80 border border-purple-500/60 text-purple-200 rounded text-xs transition-all text-left flex items-center justify-between cursor-pointer disabled:opacity-50"
              >
                <div className="truncate">
                  <div className="font-bold truncate text-white">@Sanvi850</div>
                  <div className="text-[9px] text-purple-400">Admin</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickAdminLogin('panchadip125')}
                className="py-2 px-2 bg-purple-950/50 hover:bg-purple-900/80 border border-purple-500/60 text-purple-200 rounded text-xs transition-all text-left flex items-center justify-between cursor-pointer disabled:opacity-50"
              >
                <div className="truncate">
                  <div className="font-bold truncate text-white">@panchadip125</div>
                  <div className="text-[9px] text-purple-400">Admin</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
