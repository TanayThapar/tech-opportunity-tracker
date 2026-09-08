'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { login, signup, getCurrentUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Terminal, Shield, User, Mail, ArrowRight, Lock, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSignUp) {
      const res = signup(name, email, handle);
      if (!res.success) {
        setError(res.error || 'Signup failed');
        return;
      }
      if (res.user?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } else {
      const res = login(email);
      if (!res.success) {
        setError(res.error || 'Login failed');
        return;
      }
      if (res.user?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    }
  };

  const handleQuickAdmin = () => {
    login('tanay@techradar.dev', 'admin');
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-[#070b0e] text-zinc-200 font-mono flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-[#0b1016] border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="border-b border-zinc-800/80 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Terminal className="w-4 h-4" />
              <span>AUTH_TERMINAL_GATE</span>
            </div>
            <span className="text-[11px] text-zinc-500 uppercase">
              {isSignUp ? 'REGISTER_USER' : 'LOGIN_SESSION'}
            </span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {isSignUp ? 'Create Opportunity Radar Account' : 'Authenticate Session'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Sign in to sync your starred opportunities, log team attendance, and access admin telemetry.
            </p>
          </div>

          {error && (
            <div className="p-2.5 rounded bg-rose-950/40 border border-rose-500/60 text-rose-300 text-xs font-mono">
              // ERROR: {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-zinc-400 mb-1">NAME</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="Your full name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">HANDLE / CALLSIGN</label>
                  <div className="relative">
                    <span className="text-zinc-500 absolute left-3 top-2 text-xs font-bold">@</span>
                    <input
                      type="text"
                      placeholder="hacker_handle"
                      value={handle}
                      onChange={e => setHandle(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-zinc-400 mb-1">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="tanay@techradar.dev or your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>{isSignUp ? 'SIGN_UP' : 'ENTER_RADAR'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Switch mode */}
          <div className="pt-2 text-center text-xs text-zinc-400">
            {isSignUp ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-emerald-400 hover:underline font-bold"
                >
                  Log in
                </button>
              </span>
            ) : (
              <span>
                New hacker?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-emerald-400 hover:underline font-bold"
                >
                  Create an account
                </button>
              </span>
            )}
          </div>

          {/* Quick Admin Demo Login */}
          <div className="pt-3 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={handleQuickAdmin}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800/80 border border-cyan-500/50 text-cyan-300 rounded text-xs flex items-center justify-center gap-2 transition-all group"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>LOG IN AS ADMIN (TANAY)</span>
            </button>
            <p className="text-[10px] text-zinc-500 text-center mt-1.5">
              Instantly authorizes administrative role and redirects to private backend telemetry.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
