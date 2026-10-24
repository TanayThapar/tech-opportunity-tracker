'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { login, signup, getCurrentUser, isDemoMode } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Terminal, Shield, User, ArrowRight, Lock, KeyRound, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const demoActive = isDemoMode();

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSignUp) {
      const res = signup(name, identifier);
      if (!res.success) {
        setError(res.error || 'Registration failed');
        return;
      }
      router.push('/');
    } else {
      const res = login(identifier);
      if (!res.success) {
        setError(res.error || 'Authentication failed');
        return;
      }
      router.push('/');
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
          className="w-full max-w-md bg-[#0b1016] border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-5 relative overflow-hidden"
        >
          {demoActive && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/50 rounded-lg text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">LOCAL DEMO MODE</span>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Sign in with any handle/email to test user features. In demo mode, admin and pipeline controls are disabled.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Terminal className="w-3.5 h-3.5" />
              <span>// AUTH_GATEWAY</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isSignUp ? 'Create Radar Profile' : 'Sign In to TechRadar'}
            </h1>
            <p className="text-xs text-zinc-400">
              {isSignUp
                ? 'Register your profile to track opportunities, star events, and set reminders.'
                : 'Access your saved hackathons, conferences, and custom updates.'}
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
                  Full Name
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
                Email or Username
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="your.email@example.com"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950"
            >
              <span>{isSignUp ? 'Register Account' : 'Authenticate Session'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-zinc-500">
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
                  Create identity
                </button>
              </span>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
