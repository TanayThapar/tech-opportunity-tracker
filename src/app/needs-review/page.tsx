'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import OpportunityCard from '@/components/OpportunityCard';
import { TechOpportunity } from '@/types';
import { AlertCircle, CheckCircle2, RefreshCw, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
        setStatusMessage('Item verified and upgraded to High Confidence.');
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err) {
      console.error('Error verifying item:', err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Public Calendar & Feed</span>
          </Link>
        </div>

        {/* Section Header */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-800/80">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Needs Review (Low-Confidence Discoveries)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                  {reviewItems.length} items
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-3xl">
                Per specification, <strong>all discovered opportunities auto-publish immediately</strong> to prevent missing opportunities.
                However, items with tentative dates, unverified forum sources, or ambiguous near-duplicate similarities are surfaced here for spot-checking.
              </p>
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Items Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400">
            <RefreshCw className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs">Loading review backlog...</p>
          </div>
        ) : reviewItems.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              All clear! No items currently need review.
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Every discovered opportunity currently has verified dates, active organizer URLs, and unambiguous taxonomy.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
