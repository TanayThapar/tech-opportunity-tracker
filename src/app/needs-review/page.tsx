'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import OpportunityCard from '@/components/OpportunityCard';
import { TechOpportunity } from '@/types';
import { AlertCircle, CheckCircle2, RefreshCw, ShieldAlert, ArrowLeft, Terminal } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';

export default function NeedsReviewPage() {
  const [reviewItems, setReviewItems] = useState<TechOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchLowConfidenceEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/opportunities?confidence=low');
      const json = await res.json();
      if (json.success) {
        setReviewItems(json.data);
      }
    } catch (err) {
      console.error('Failed fetching review items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowConfidenceEvents();
  }, []);

  const handleVerify = async (id: string) => {
    try {
      const res = await fetch('/api/opportunities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, discovery_confidence: 'high' }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewItems(prev => prev.filter(item => item.id !== id));
        setStatusMessage('Item verified and elevated to High Confidence.');
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err) {
      console.error('Error verifying item:', err);
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

        {/* Terminal Header */}
        <div className="p-4 rounded-xl bg-[#0d1319] border border-amber-500/50 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-amber-300">
                  // AUDIT_BACKLOG: LOW_CONFIDENCE_ITEMS
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-500/60">
                  {reviewItems.length} PENDING
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
                These events were auto-published per policy, but were flagged with low confidence due to tentative dates, unverified community links, or near-duplicate similarities.
              </p>
            </div>
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
            <p>// Fetching review backlog...</p>
          </div>
        ) : reviewItems.length === 0 ? (
          <div className="py-16 text-center bg-[#090e13] rounded-xl border border-zinc-800 p-8">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
            <h3 className="text-sm font-bold text-zinc-200">// All events verified!</h3>
            <p className="text-xs text-zinc-500 mt-1">
              No discovered opportunities currently need manual review.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewItems.map(item => (
              <OpportunityCard
                key={item.id}
                opportunity={item}
                onUpdateConfidence={handleVerify}
                showReviewActions={true}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
