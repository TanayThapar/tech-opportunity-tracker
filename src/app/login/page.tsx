'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { loginWithServer, signupWithServer, getCurrentUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Shield, User, ArrowRight, Lock, KeyRound, Radio } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        const res = await signupWithServer(name, identifier, password);
        if (!res.success) {
          setError(res.error || 'Registration failed');
          return;
        }
        router.push('/');
      } else {
        const res = await loginWithServer(identifier, password);
        if (!res.success) {
          setError(res.error || 'Authentication failed');
          return;
        }
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

  return (
    <div className="min-h-screen bg-[#0c1015] text-[#e6edf3] font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-[#111620] border border-slate-800 rounded-xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="space-y-1.5 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/20 text-lime-400 mb-2">
              <Radio className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isSignUp ? 'Create Opportunity Radar Account' : 'Sign In to Opportunity Radar'}
            </h1>
            <p className="text-xs text-slate-400">
              {isSignUp
                ? 'Track deadlines, save hackathons and conferences, and configure notification alerts.'
                : 'Access your saved opportunities, personal calendar, and notification feeds.'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Chen"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#0c1015] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-lime-400 text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email or Username
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. researcher@university.edu"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0c1015] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-lime-400 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0c1015] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-lime-400 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 mt-2"
            >
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800">
            {isSignUp ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-lime-400 hover:underline font-semibold cursor-pointer"
                >
                  Sign in
                </button>
              </span>
            ) : (
              <span>
                Don&apos;t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-lime-400 hover:underline font-semibold cursor-pointer"
                >
                  Create account
                </button>
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
