'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import OpportunityCard from '@/components/OpportunityCard';
import { TechOpportunity } from '@/types';
import { getCurrentUser, fetchCurrentUser, getAuthHeaders } from '@/lib/auth';
import { AlertCircle, CheckCircle2, RefreshCw, ShieldAlert, ArrowLeft, Shield, Check } from 'lucide-react';
import Link from 'next/link';

export default function NeedsReviewPage() {
  const [reviewItems, setReviewItems] = useState<TechOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [approvalBasis, setApprovalBasis] = useState('Organizer official link and dates verified');

  const fetchPendingEvents = async () => {
    try {
      setLoading(true);
      await fetchCurrentUser();
      const res = await fetch('/api/opportunities?status=needs_review', {
        headers: getAuthHeaders(),
      });
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
    try {
      const res = await fetch('/api/opportunities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
    <div className="min-h-screen bg-[#0c1015] text-[#e6edf3] font-sans flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-5">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-lime-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Return to Opportunity Radar</span>
          </Link>
        </div>

        {/* Header */}
        <div className="p-5 rounded-xl bg-[#111620] border border-amber-500/40 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white">
                  Moderation & Review Quarantine
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/50">
                  {reviewItems.length} PENDING
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                Unverified entries, AI extractions, or items with missing critical dates remain quarantined here. Items in this queue do not appear on the public radar until approved by a moderator.
              </p>
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 bg-lime-950/40 border border-lime-500/40 text-lime-300 text-xs rounded-lg flex items-center gap-2">
            <Check className="w-4 h-4 text-lime-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Approval basis control */}
        <div className="p-4 bg-[#111620] border border-slate-800 rounded-xl space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Verification Basis (Mandatory record on human approval)
          </label>
          <input
            type="text"
            value={approvalBasis}
            onChange={e => setApprovalBasis(e.target.value)}
            className="w-full bg-[#0c1015] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
            placeholder="e.g. Organizer official website and schedule manually verified"
          />
        </div>

        {/* Pending Items Grid */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-mono">
            Loading quarantined candidates...
          </div>
        ) : reviewItems.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-[#111620] border border-slate-800 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-lime-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">Quarantine Queue Clear</h3>
            <p className="text-xs text-slate-400">
              No items currently require human verification.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviewItems.map(item => (
              <div key={item.id} className="relative group">
                <OpportunityCard opportunity={item} />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve & Publish to Radar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
