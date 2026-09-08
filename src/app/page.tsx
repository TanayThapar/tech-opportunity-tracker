'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import FilterBar from '@/components/FilterBar';
import OpportunityCard from '@/components/OpportunityCard';
import CalendarView from '@/components/CalendarView';
import SubmitOpportunityModal from '@/components/SubmitOpportunityModal';
import { TechOpportunity, OpportunityType, OpportunityFormat } from '@/types';
import { Calendar, LayoutList, Terminal, AlertCircle, Compass, Star, UserCheck, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { getAllInteractions } from '@/lib/interactions';

export default function HomePage() {
  const [opportunities, setOpportunities] = useState<TechOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedType, setSelectedType] = useState<OpportunityType | 'all'>('all');
  const [selectedTier, setSelectedTier] = useState<string | 'all'>('all');
  const [selectedFormat, setSelectedFormat] = useState<OpportunityFormat | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [onlyAttending, setOnlyAttending] = useState(false);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [pipelineToast, setPipelineToast] = useState<string | null>(null);
  const [interactionVersion, setInteractionVersion] = useState(0);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
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
    const handleInteractionChange = () => {
      setInteractionVersion(v => v + 1);
    };
    window.addEventListener('techradar_interaction_change', handleInteractionChange);
    return () => {
      window.removeEventListener('techradar_interaction_change', handleInteractionChange);
    };
  }, []);

  const handleTriggerPipeline = async () => {
    try {
      setIsRunningPipeline(true);
      setPipelineToast('Executing discovery pipeline across web feeds...');
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
      setTimeout(() => setPipelineToast(null), 6000);
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

  const tierList = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach(o => {
      if (o.conference_tier) set.add(o.conference_tier);
    });
    ['Core A*', 'Core A', 'Core B', 'Core C'].forEach(t => set.add(t));
    return Array.from(set);
  }, [opportunities]);

  const filtered = useMemo(() => {
    const interactions = getAllInteractions();

    return opportunities.filter(item => {
      if (selectedType !== 'all' && item.type !== selectedType) return false;
      if (selectedTier !== 'all' && item.conference_tier !== selectedTier) return false;
      if (selectedFormat !== 'all' && item.format !== selectedFormat) return false;

      const userInt = interactions[item.id];
      if (onlyStarred && !userInt?.starred) return false;
      if (onlyAttending && !userInt?.participating) return false;

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
  }, [opportunities, selectedType, selectedTier, selectedFormat, searchQuery, onlyStarred, onlyAttending, interactionVersion]);

  const lowConfidenceCount = useMemo(() => {
    return opportunities.filter(o => o.discovery_confidence === 'low').length;
  }, [opportunities]);

  return (
    <div className="min-h-screen bg-[#070b0e] text-zinc-200 font-mono flex flex-col selection:bg-emerald-500 selection:text-black">
      <Navbar onTriggerPipeline={handleTriggerPipeline} isRunningPipeline={isRunningPipeline} />

      {/* Terminal Toast Notification */}
      {pipelineToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md p-3.5 bg-[#0e161e] border border-emerald-500/80 text-emerald-300 rounded shadow-[0_0_20px_rgba(0,255,102,0.15)] flex items-center gap-3 text-xs">
          <Terminal className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="font-mono">{pipelineToast}</p>
        </div>
      )}

      {/* Live Submission Modal */}
      <SubmitOpportunityModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmitted={fetchOpportunities}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-5">
        {/* Terminal Header Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <span>SYSTEM: LIVE_RADAR</span>
              <span>•</span>
              <span className="text-emerald-400">ZERO_SAMPLE_DATA</span>
              <span>•</span>
              <span>INDEXED: {opportunities.length} LIVE EVENTS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="text-emerald-400">&gt;</span> TECH_OPPORTUNITY_TRACKER
            </h1>
          </div>

          {/* Quick Filters, View Switcher & Submit Action */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Submit Button */}
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold transition-all shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ SUBMIT_EVENT</span>
            </button>

            {/* Starred filter */}
            <button
              onClick={() => setOnlyStarred(!onlyStarred)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-all border ${
                onlyStarred
                  ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-amber-300'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>STARRED</span>
            </button>

            {/* Attending filter */}
            <button
              onClick={() => setOnlyAttending(!onlyAttending)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-all border ${
                onlyAttending
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-emerald-300'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>MY_ATTENDANCE</span>
            </button>

            {lowConfidenceCount > 0 && (
              <Link
                href="/needs-review"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-amber-950/40 border border-amber-500/50 text-amber-300 text-xs hover:bg-amber-900/40"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>REVIEW [{lowConfidenceCount}]</span>
              </Link>
            )}

            {/* View Mode Switcher */}
            <div className="flex bg-zinc-900 p-1 rounded border border-zinc-800">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-emerald-600 text-black font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>CALENDAR</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
                  viewMode === 'list'
                    ? 'bg-emerald-600 text-black font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>FEED</span>
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

        {/* Active Content */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-zinc-500 text-xs">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span>// Loading live event registry...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center bg-[#090e13] rounded-xl border border-zinc-800 p-8 space-y-3">
            <Compass className="w-8 h-8 mx-auto text-zinc-600" />
            <h3 className="text-sm font-bold text-zinc-300">// 0 LIVE OPPORTUNITIES IN REGISTRY</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Sample data has been completely eliminated. Submit a real live opportunity using the button below or trigger the automated discovery crawler.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded transition-colors flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ SUBMIT FIRST LIVE EVENT</span>
              </button>
              <button
                onClick={handleTriggerPipeline}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded border border-zinc-700 transition-colors"
              >
                RUN WEB DISCOVERY PIPELINE
              </button>
            </div>
          </div>
        ) : viewMode === 'calendar' ? (
          <CalendarView opportunities={filtered} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Terminal Footer */}
      <footer className="border-t border-zinc-800/80 py-4 text-xs text-zinc-500 bg-[#080d12]/90">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono">
          <p>
            <span className="text-emerald-400">techradar</span> v1.3.0 • live user edition
          </p>
          <div className="flex items-center gap-4">
            <Link href="/needs-review" className="hover:text-zinc-300">
              Needs Review ({lowConfidenceCount})
            </Link>
            <Link href="/pipeline-logs" className="hover:text-zinc-300">
              Pipeline Logs
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
