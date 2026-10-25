'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import { loginWithServer, signupWithServer, logoutWithServer, getCurrentUser } from '@/lib/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Shield,
  User,
  ArrowRight,
  Lock,
  Mail,
  AtSign,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  LogOut,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { UserProfile } from '@/types/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Form Fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check if user is currently signed in
    const existing = getCurrentUser();
    if (existing) {
      setCurrentUser(existing);
    }
  }, []);

  const handleSignOut = async () => {
    setError(null);
    setSuccessMsg(null);
    await logoutWithServer();
    setCurrentUser(null);
  };

  const handleQuickFill = (presetHandle: string) => {
    setMode('signin');
    setIdentifier(presetHandle);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!email.trim() && !identifier.trim()) {
        setError('Please enter your email address.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter to confirm.');
        return;
      }

      setSubmitting(true);
      try {
        const signupIdentifier = handle.trim() || email.trim() || identifier.trim();
        const res = await signupWithServer(
          name.trim(),
          signupIdentifier,
          password,
          email.trim(),
          handle.trim()
        );

        if (!res.success) {
          setError(res.error || 'Registration failed. Please try a different username or email.');
          return;
        }

        setSuccessMsg(`Welcome, ${res.user?.name || 'Researcher'}! Account created successfully.`);
        setTimeout(() => {
          const target = redirectParam || (res.user?.role === 'admin' ? '/admin' : '/');
          window.location.href = target;
        }, 800);
      } finally {
        setSubmitting(false);
      }
    } else {
      // Sign In mode
      if (!identifier.trim()) {
        setError('Please enter your username or email.');
        return;
      }

      setSubmitting(true);
      try {
        const res = await loginWithServer(identifier.trim(), password);
        if (!res.success) {
          setError(res.error || 'Authentication failed. Please verify your credentials.');
          return;
        }

        setSuccessMsg(`Authenticated as ${res.user?.name || res.user?.handle}! Redirecting...`);
        setTimeout(() => {
          const target = redirectParam || (res.user?.role === 'admin' ? '/admin' : '/');
          window.location.href = target;
        }, 600);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="w-full max-w-md bg-[#111620] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
      {/* Active User Alert (Prevents Trapping & Provides Switch Option) */}
      {currentUser && (
        <div className="p-3.5 rounded-xl bg-lime-400/10 border border-lime-400/25 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserCheck className="w-4 h-4 text-lime-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-300">Signed in as </span>
              <span className="font-semibold text-white truncate">{currentUser.name}</span>
              <span className="text-slate-400 font-mono text-[11px]"> (@{currentUser.handle})</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href={redirectParam || (currentUser.role === 'admin' ? '/admin' : '/')}
              className="px-2.5 py-1 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded text-[11px] transition-colors"
            >
              Continue
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Sign out of current account"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="space-y-1.5 text-center">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-lime-400/10 border border-lime-400/25 text-lime-400 shadow-sm mb-1">
          <Shield className="w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          {mode === 'signup' ? 'Create Radar Account' : 'Sign In to Opportunity Radar'}
        </h1>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          {mode === 'signup'
            ? 'Track deadlines, save hackathons & conferences, and synchronize personal calendars.'
            : 'Access verified opportunity feeds, personalized watchlist, and role-based features.'}
        </p>
      </div>

      {/* Segmented Mode Switcher */}
      <div className="grid grid-cols-2 p-1 bg-[#0c1015] border border-slate-800 rounded-xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setError(null);
            setSuccessMsg(null);
          }}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
            mode === 'signin'
              ? 'bg-lime-400 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setError(null);
            setSuccessMsg(null);
          }}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
            mode === 'signup'
              ? 'bg-lime-400 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Create Account</span>
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-lime-950/40 border border-lime-400/50 text-lime-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
          <div>{successMsg}</div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {mode === 'signup' ? (
          <>
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name <span className="text-lime-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Alex Chen"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0c1015] border border-slate-700 rounded-lg text-white placeholder-slate-500 text-xs focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address <span className="text-lime-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="researcher@university.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0c1015] border border-slate-700 rounded-lg text-white placeholder-slate-500 text-xs focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                />
              </div>
            </div>

            {/* Username / Handle */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Username / Handle
              </label>
              <div className="relative">
                <AtSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. alexchen"
                  value={handle}
                  onChange={e => setHandle(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  className="w-full pl-9 pr-3 py-2 bg-[#0c1015] border border-slate-700 rounded-lg text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password <span className="text-lime-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-[#0c1015] border border-slate-700 rounded-lg text-white placeholder-slate-500 text-xs focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirm Password <span className="text-lime-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-[#0c1015] border border-slate-700 rounded-lg text-white placeholder-slate-500 text-xs focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Sign In Identifier */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Username or Email <span className="text-lime-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="e.g. TanayThapar or researcher@university.edu"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0c1015] border border-slate-700 rounded-lg text-white placeholder-slate-500 text-xs focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                />
              </div>
            </div>

            {/* Sign In Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-slate-500">Required if set</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-[#0c1015] border border-slate-700 rounded-lg text-white placeholder-slate-500 text-xs focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 mt-4 active:scale-[0.99]"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Root Admin Helper & Chips */}
      {mode === 'signin' && (
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Root Administrator accounts:</span>
            </span>
            <span className="font-mono text-purple-300 text-[10px]">LOCKED ACCESS</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickFill('TanayThapar')}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-purple-500/30 hover:border-purple-400/60 rounded text-[11px] font-mono text-purple-300 transition-colors cursor-pointer"
              title="Click to fill TanayThapar"
            >
              @TanayThapar
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('Sanvi850')}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-purple-500/30 hover:border-purple-400/60 rounded text-[11px] font-mono text-purple-300 transition-colors cursor-pointer"
              title="Click to fill Sanvi850"
            >
              @Sanvi850
            </button>
          </div>
        </div>
      )}

      {/* Footer Switcher */}
      <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800">
        {mode === 'signup' ? (
          <span>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
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
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className="text-lime-400 hover:underline font-semibold cursor-pointer"
            >
              Create account
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0c1015] text-[#e6edf3] font-sans flex flex-col selection:bg-lime-400 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense
          fallback={
            <div className="w-full max-w-md bg-[#111620] border border-slate-800 rounded-2xl p-8 flex items-center justify-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
