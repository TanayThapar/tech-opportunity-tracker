'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import FilterBar from '@/components/FilterBar';
import OpportunityCard from '@/components/OpportunityCard';
import CalendarView from '@/components/CalendarView';
import { TechOpportunity, OpportunityType, OpportunityFormat } from '@/types';
import { Calendar, LayoutList, Sparkles, AlertCircle, Compass } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [opportunities, setOpportunities] = useState<TechOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [selectedType, setSelectedType] = useState<OpportunityType | 'all'>('all');
  const [selectedTier, setSelectedTier] = useState<string | 'all'>('all');
  const [selectedFormat, setSelectedFormat] = useState<OpportunityFormat | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [pipelineToast, setPipelineToast] = useState<string | null>(null);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      // Main view fetches status=published
      const res = await fetch('/api/opportunities?status=published');
      const json = await res.json();
      if (json.success) {
        setOpportunities(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleTriggerPipeline = async () => {
    try {
      setIsRunningPipeline(true);
      setPipelineToast('Running web discovery pipeline...');
      const res = await fetch('/api/pipeline/run', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPipelineToast(data.message || 'Discovery run finished!');
        await fetchOpportunities();
      } else {
        setPipelineToast('Discovery run failed: ' + data.error);
      }
    } catch (err: any) {
      setPipelineToast('Pipeline error: ' + err.message);
    } finally {
      setIsRunningPipeline(false);
      setTimeout(() => setPipelineToast(null), 7000);
    }
  };

  const handleUpdateConfidence = async (id: string, newConfidence: 'high' | 'low') => {
    try {
      const res = await fetch('/api/opportunities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, discovery_confidence: newConfidence }),
      });
      const data = await res.json();
      if (data.success) {
        setOpportunities(prev => prev.map(o => (o.id === id ? { ...o, discovery_confidence: newConfidence } : o)));
      }
    } catch (err) {
      console.error('Failed updating opportunity confidence:', err);
    }
  };

  // Distinct conference tiers available in data
  const tierList = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach(o => {
      if (o.conference_tier) set.add(o.conference_tier);
    });
    // Ensure standard tiers are available options
    ['Core A*', 'Core A', 'Core B', 'Core C'].forEach(t => set.add(t));
    return Array.from(set);
  }, [opportunities]);

  // Filtered opportunities
  const filtered = useMemo(() => {
    return opportunities.filter(item => {
      // Type filter
      if (selectedType !== 'all' && item.type !== selectedType) {
        return false;
      }
      // Tier filter
      if (selectedTier !== 'all' && item.conference_tier !== selectedTier) {
        return false;
      }
      // Format filter
      if (selectedFormat !== 'all' && item.format !== selectedFormat) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesOrg = item.organizer.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesTier = item.conference_tier?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesOrg && !matchesDesc && !matchesTier) {
          return false;
        }
      }
      return true;
    });
  }, [opportunities, selectedType, selectedTier, selectedFormat, searchQuery]);

  const lowConfidenceCount = useMemo(() => {
    return opportunities.filter(o => o.discovery_confidence === 'low').length;
  }, [opportunities]);

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      <Navbar onTriggerPipeline={handleTriggerPipeline} isRunningPipeline={isRunningPipeline} />

      {/* Toast Alert */}
      {pipelineToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md p-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl shadow-xl flex items-center gap-3 border border-zinc-700 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-5 h-5 text-indigo-400 dark:text-indigo-600 flex-shrink-0" />
          <p className="text-xs font-medium">{pipelineToast}</p>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
              <span>Upcoming Tech Opportunities</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
              Track vetted Core A*/A/B conferences, global student & company hackathons, specialized engineering workshops, and internship openings — continuously auto-discovered.
            </p>
          </div>

          {/* View Toggle & Review Notice */}
          <div className="flex items-center gap-3">
            {lowConfidenceCount > 0 && (
              <Link
                href="/needs-review"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium hover:bg-amber-100 transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>{lowConfidenceCount} Needs Review</span>
              </Link>
            )}

            <div className="flex bg-zinc-200/80 dark:bg-zinc-800 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Feed View</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Month Calendar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar
          selectedType={selectedType}
          onSelectType={setSelectedType}
          selectedTier={selectedTier}
          onSelectTier={setSelectedTier}
          selectedFormat={selectedFormat}
          onSelectFormat={setSelectedFormat}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          tierList={tierList}
        />

        {/* Main Content Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-medium">Loading opportunities...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
            <Compass className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">No opportunities match your filter</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Try resetting your conference tier, event type, or keyword search.
            </p>
          </div>
        ) : viewMode === 'calendar' ? (
          <CalendarView opportunities={filtered} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(item => (
              <OpportunityCard
                key={item.id}
                opportunity={item}
                onUpdateConfidence={handleUpdateConfidence}
                showReviewActions={true}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-white/50 dark:bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Tech Opportunity Tracker • Public Calendar & Automated Pipeline</p>
          <div className="flex items-center gap-4">
            <Link href="/needs-review" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Needs Review ({lowConfidenceCount})
            </Link>
            <Link href="/pipeline-logs" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Discovery Engine Logs
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
