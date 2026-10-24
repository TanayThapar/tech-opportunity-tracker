'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import OpportunityCard from '@/components/OpportunityCard';
import { TechOpportunity } from '@/types';
import { getCurrentUser, fetchCurrentUser } from '@/lib/auth';
import { AlertCircle, CheckCircle2, RefreshCw, ShieldAlert, ArrowLeft, Shield, Check } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';

export default function NeedsReviewPage() {
  const [reviewItems, setReviewItems] = useState<TechOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [approvalBasis, setApprovalBasis] = useState('Organizer official link and dates verified');

  const fetchPendingEvents = async () => {
    let user = getCurrentUser();
    try {
      setLoading(true);
      const serverUser = await fetchCurrentUser();
      if (serverUser) user = serverUser;

      const headers: Record<string, string> = {};
      if (user?.email) headers['x-user-email'] = user.email;
      if (user?.id) headers['x-user-id'] = user.id;
      if (user?.handle) headers['x-user-handle'] = user.handle;

      const res = await fetch('/api/opportunities?status=needs_review', { headers });
      const json = await res.json();
      if (json.success) {
        setReviewItems(json.data);
      } else {
        setStatusMessage(json.error || 'Failed to load review items');
      }
    } catch (err) {
      console.error('Failed fetching review items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const handleApprove = async (id: string) => {
    let user = getCurrentUser();
    try {
      const serverUser = await fetchCurrentUser();
      if (serverUser) user = serverUser;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.email) headers['x-user-email'] = user.email;
      if (user?.id) headers['x-user-id'] = user.id;
      if (user?.handle) headers['x-user-handle'] = user.handle;

      const res = await fetch('/api/opportunities', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          id,
          status: 'published',
          discovery_confidence: 'high',
          approval_basis: approvalBasis,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewItems(prev => prev.filter(item => item.id !== id));
        setStatusMessage('Item approved and published to the live public catalog.');
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        alert(data.error || 'Failed to approve item');
      }
    } catch (err) {
      console.error('Error approving item:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b0e] text-zinc-200 font-mono flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-5">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>&lt;- cd .. (return to calendar)</span>
          </Link>
        </div>

        {/* Header */}
        <div className="p-4 rounded-xl bg-[#0d1319] border border-amber-500/50 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-amber-300">
                  // MODERATION_QUEUE: UNPUBLISHED_ITEMS_PENDING_REVIEW
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-500/60">
                  {reviewItems.length} PENDING
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
                Per publication policy, only high-confidence items from structured adapters auto-publish.
                User submissions, admin entries, AI-extracted records, and low-confidence items remain unpublished until a human moderator approves them.
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-zinc-500 font-semibold">Approval Basis Note:</span>
            <input
              type="text"
              value={approvalBasis}
              onChange={e => setApprovalBasis(e.target.value)}
              className="bg-[#080c10] border border-zinc-800 rounded px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-emerald-500 flex-1 max-w-md text-xs font-mono"
              placeholder="e.g. Organizer official link and dates verified"
            />
          </div>
        </div>

        {statusMessage && (
          <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/70 text-emerald-300 rounded text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mb-2 text-emerald-400" />
            <p>// Fetching review queue...</p>
          </div>
        ) : reviewItems.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-[#0d1319] border border-zinc-800 space-y-3">
            <Check className="w-8 h-8 text-emerald-400 mx-auto" />
            <h2 className="text-sm font-bold text-zinc-200">// QUEUE_EMPTY</h2>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              All opportunities in the system are currently reviewed and accounted for.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewItems.map(item => (
              <OpportunityCard
                key={item.id}
                opportunity={item}
                showReviewActions={true}
                onApprove={handleApprove}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
