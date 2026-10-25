'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import FilterBar from '@/components/FilterBar';
import OpportunityCard from '@/components/OpportunityCard';
import CalendarView from '@/components/CalendarView';
import SubmitOpportunityModal from '@/components/SubmitOpportunityModal';
import CalendarSubscriptionModal from '@/components/CalendarSubscriptionModal';
import CollisionRadarBanner from '@/components/CollisionRadarBanner';
import SkillPickerModal from '@/components/SkillPickerModal';
import { TechOpportunity, OpportunityType, OpportunityFormat } from '@/types';
import {
  Calendar,
  LayoutList,
  AlertCircle,
  Compass,
  Star,
  UserCheck,
  PlusCircle,
  RefreshCw,
  Clock,
  Sparkles,
  Radio,
  ExternalLink,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { SocietyFilter, matchesSociety, getSocietyStats } from '@/lib/societyUtils';
import { getAllInteractions } from '@/lib/interactions';
import { detectDeadlineCollisions, getOpportunityCollision } from '@/lib/collisionRadar';
import { getUserSkills, extractSkills, calculateSkillMatch } from '@/lib/skillMatcher';
import { format, parseISO, differenceInDays } from 'date-fns';

export default function HomePage() {
  const [opportunities, setOpportunities] = useState<TechOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedType, setSelectedType] = useState<OpportunityType | 'all'>('all');
  const [selectedTier, setSelectedTier] = useState<string | 'all'>('all');
  const [selectedFormat, setSelectedFormat] = useState<OpportunityFormat | 'all'>('all');
  const [selectedCompany, setSelectedCompany] = useState<string | 'all'>('all');
  const [selectedSubfield, setSelectedSubfield] = useState<string | 'all'>('all');
  const [selectedSociety, setSelectedSociety] = useState<SocietyFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [onlyAttending, setOnlyAttending] = useState(false);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [pipelineToast, setPipelineToast] = useState<string | null>(null);
  const [interactionVersion, setInteractionVersion] = useState(0);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);
  const [isSkillPickerOpen, setIsSkillPickerOpen] = useState(false);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [onlyMatchingSkills, setOnlyMatchingSkills] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [refreshIntervalHours, setRefreshIntervalHours] = useState<number>(6);
  const [scheduleStatus, setScheduleStatus] = useState<{
    lastRunAt: string | null;
    nextRunAt: string | null;
    intervalHours: number;
    timeRemainingSeconds: number | null;
  } | null>(null);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/opportunities?status=published');
      const json = await res.json();
      if (json.success) {
        setOpportunities(json.data);
        setLastRefreshedAt(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduleStatus = async () => {
    try {
      const res = await fetch('/api/pipeline/schedule');
      const json = await res.json();
      if (json.success && json.data) {
        setScheduleStatus(json.data);
        if (json.data.intervalHours) {
          setRefreshIntervalHours(json.data.intervalHours);
        }
      }
    } catch {
      // Non-fatal
    }
  };

  const handleUpdateInterval = async (hours: number) => {
    setRefreshIntervalHours(hours);
    try {
      await fetch('/api/pipeline/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalHours: hours }),
      });
      fetchScheduleStatus();
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchOpportunities();
    fetchScheduleStatus();
    setUserSkills(getUserSkills());

    const timer = setInterval(() => {
      fetchScheduleStatus();
    }, 60000);

    const handleInteractionChange = () => setInteractionVersion(v => v + 1);
    const handleSkillsChange = () => setUserSkills(getUserSkills());

    window.addEventListener('techradar_interaction_change', handleInteractionChange);
    window.addEventListener('techradar_skills_change', handleSkillsChange);
    return () => {
      clearInterval(timer);
      window.removeEventListener('techradar_interaction_change', handleInteractionChange);
      window.removeEventListener('techradar_skills_change', handleSkillsChange);
    };
  }, []);

  const handleTriggerPipeline = async () => {
    try {
      setIsRunningPipeline(true);
      setPipelineToast('Syncing opportunity feeds via source adapters...');
      const res = await fetch('/api/pipeline/run', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPipelineToast(data.message || 'Discovery run finished successfully.');
        await fetchOpportunities();
      } else {
        setPipelineToast('Pipeline notice: ' + data.error);
      }
    } catch (err: any) {
      setPipelineToast('Pipeline error: ' + err.message);
    } finally {
      setIsRunningPipeline(false);
      setTimeout(() => setPipelineToast(null), 6000);
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

  const companyList = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach(o => {
      const comp = o.company || (o.type === 'job' ? o.organizer : null);
      if (comp) set.add(comp);
    });
    return Array.from(set).sort();
  }, [opportunities]);

  const subfieldList = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach(o => {
      if (o.subfield) set.add(o.subfield);
    });
    [
      'AI / Machine Learning',
      'Systems & Architecture',
      'Security & Privacy',
      'Software Engineering & PL',
      'Databases & Data Mining',
      'Computer Networks & Mobile',
      'Theory & Algorithms',
      'HCI & Computer Graphics',
    ].forEach(s => set.add(s));
    return Array.from(set).sort();
  }, [opportunities]);

  // Deadline Collision Clusters (Feature #1)
  const collisionClusters = useMemo(() => {
    return detectDeadlineCollisions(opportunities);
  }, [opportunities]);

  // Closing soon calculations (deadlines approaching within 45 days)
  const closingSoonItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return opportunities
      .filter(item => {
        const deadlineStr = item.submission_deadline || item.application_deadline || item.start_date;
        if (!deadlineStr) return false;
        try {
          const d = parseISO(deadlineStr);
          const diff = differenceInDays(d, today);
          return diff >= 0 && diff <= 45;
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        const dA = a.submission_deadline || a.application_deadline || a.start_date;
        const dB = b.submission_deadline || b.application_deadline || b.start_date;
        return (dA || '').localeCompare(dB || '');
      })
      .slice(0, 4);
  }, [opportunities]);

  const filtered = useMemo(() => {
    const interactions = getAllInteractions();
    return opportunities.filter(item => {
      if (selectedType !== 'all' && item.type !== selectedType) return false;
      if (selectedTier !== 'all' && item.conference_tier !== selectedTier) return false;
      if (selectedSubfield !== 'all' && item.subfield !== selectedSubfield) return false;
      if (!matchesSociety(item, selectedSociety)) return false;
      if (selectedFormat !== 'all' && item.format !== selectedFormat) return false;
      if (selectedCompany !== 'all') {
        const itemCompany = item.company || (item.type === 'job' ? item.organizer : null);
        if (itemCompany !== selectedCompany) return false;
      }
      const userInt = interactions[item.id];
      if (onlyStarred && !userInt?.starred) return false;
      if (onlyAttending && !userInt?.participating) return false;
      if (onlyMatchingSkills && userSkills.length > 0) {
        const itemSkills = item.skills || extractSkills(item);
        const match = calculateSkillMatch(itemSkills, userSkills);
        if (match.matchCount === 0) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesOrg = item.organizer.toLowerCase().includes(q);
        const matchesCompany = (item.company || '').toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesTier = item.conference_tier?.toLowerCase().includes(q);
        const matchesSubfield = (item.subfield || '').toLowerCase().includes(q);
        const matchesLocation = (item.location || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesOrg && !matchesCompany && !matchesDesc && !matchesTier && !matchesSubfield && !matchesLocation) {
          return false;
        }
      }
      return true;
    });
  }, [
    opportunities,
    selectedType,
    selectedTier,
    selectedSubfield,
    selectedSociety,
    selectedFormat,
    selectedCompany,
    searchQuery,
    onlyStarred,
    onlyAttending,
    onlyMatchingSkills,
    userSkills,
    interactionVersion,
  ]);

  const stats = useMemo(() => {
    const counts = { conference: 0, job: 0, hackathon: 0, workshop: 0, internship: 0 };
    opportunities.forEach(o => {
      if (counts[o.type] !== undefined) counts[o.type]++;
    });
    return counts;
  }, [opportunities]);

  const societyStats = useMemo(() => getSocietyStats(opportunities), [opportunities]);

  return (
    <div className="min-h-screen bg-[#0c1015] text-[#e6edf3] font-sans flex flex-col selection:bg-lime-400 selection:text-slate-950">
      <Navbar
        onTriggerPipeline={handleTriggerPipeline}
        isRunningPipeline={isRunningPipeline}
        opportunities={opportunities}
      />

      {/* Toast Notification */}
      {pipelineToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md p-3.5 bg-[#111620] border border-slate-700 text-slate-200 rounded-xl shadow-2xl flex items-center gap-3 text-xs">
          <Radio className="w-4 h-4 text-lime-400 flex-shrink-0" />
          <p>{pipelineToast}</p>
        </div>
      )}

      <SubmitOpportunityModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmitted={fetchOpportunities}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Top Control Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Opportunity Radar</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-[11px] font-mono font-medium">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Verified computer science conferences, engineering requisitions, hackathons, and research deadlines.
              {lastRefreshedAt && (
                <span className="text-slate-500 font-mono"> · Refreshed {format(lastRefreshedAt, 'HH:mm')}</span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Scraper Refresh Interval Controls */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111620] border border-slate-800 text-xs text-slate-300">
              <span className="flex h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
              <span className="font-mono text-slate-400 hidden sm:inline">Interval:</span>
              <select
                value={refreshIntervalHours}
                onChange={e => handleUpdateInterval(Number(e.target.value))}
                className="bg-[#0c1015] border border-slate-700 rounded px-1.5 py-0.5 text-xs text-lime-400 font-mono cursor-pointer focus:outline-none focus:border-lime-400"
                title="Configured automated scraping refresh interval"
              >
                <option value={1}>Every 1h</option>
                <option value={6}>Every 6h</option>
                <option value={12}>Every 12h</option>
                <option value={24}>Every 24h</option>
              </select>
            </div>

            {/* Run Web Scrapers Now */}
            <button
              onClick={handleTriggerPipeline}
              disabled={isRunningPipeline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              title="Scrape and crawl live web feeds (MLH, SimplifyJobs, CCF Deadlines, AI Deadlines)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningPipeline ? 'animate-spin' : ''}`} />
              <span>{isRunningPipeline ? 'Scraping...' : 'Scrape Feeds Now'}</span>
            </button>

            {/* Saved Watchlist Filter */}
            <button
              onClick={() => setOnlyStarred(!onlyStarred)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
                onlyStarred
                  ? 'bg-amber-400/15 border-amber-400/60 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${onlyStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>Watchlist</span>
            </button>

            {/* Attending Filter */}
            <button
              onClick={() => setOnlyAttending(!onlyAttending)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
                onlyAttending
                  ? 'bg-lime-400/15 border-lime-400/60 text-lime-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Attending</span>
            </button>

            {/* Submit Event */}
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-lime-400" />
              <span>Submit Listing</span>
            </button>

            {/* View switcher: Cards List vs Calendar */}
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-lime-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-lime-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Feature #1: Deadline Collision Radar Banner ────────────────── */}
        {collisionClusters.length > 0 && (
          <CollisionRadarBanner clusters={collisionClusters} />
        )}

        {/* ── LEAD SECTION: "Closing Soon" Urgent Deadlines ────────────────── */}
        {closingSoonItems.length > 0 && !onlyStarred && !onlyAttending && searchQuery === '' && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Closing Soon // Upcoming Deadlines
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-500">Next 45 days</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {closingSoonItems.map(item => {
                const deadline = item.submission_deadline || item.application_deadline || item.start_date;
                const daysLeft = deadline ? differenceInDays(parseISO(deadline), new Date()) : 999;
                const isConference = item.type === 'conference';
                const isJob = item.type === 'job';

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#111620] border border-amber-500/30 hover:border-amber-400/60 transition-all flex flex-col justify-between space-y-2 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono mb-1.5">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded uppercase ${
                            isConference
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                              : isJob
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              : 'bg-lime-950 text-lime-300 border border-lime-500/30'
                          }`}
                        >
                          {item.type}
                        </span>
                        <span className="px-1.5 py-0.5 rounded font-bold bg-amber-400 text-slate-950 font-mono">
                          {daysLeft === 0 ? 'TODAY' : daysLeft === 1 ? '1 DAY LEFT' : `${daysLeft}d left`}
                        </span>
                      </div>

                      <h3 className="font-semibold text-xs text-white line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 truncate mt-1">
                        {item.company || item.organizer}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">
                        {deadline ? deadline.slice(0, 10) : 'Rolling'}
                      </span>
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lime-400 hover:text-lime-300 font-medium inline-flex items-center gap-1"
                      >
                        <span>Source</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Filter Bar */}
        <FilterBar
          selectedType={selectedType}
          onSelectType={setSelectedType}
          selectedTier={selectedTier}
          onSelectTier={setSelectedTier}
          selectedFormat={selectedFormat}
          onSelectFormat={setSelectedFormat}
          selectedCompany={selectedCompany}
          onSelectCompany={setSelectedCompany}
          selectedSubfield={selectedSubfield}
          onSelectSubfield={setSelectedSubfield}
          selectedSociety={selectedSociety}
          onSelectSociety={setSelectedSociety}
          societyCounts={societyStats}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          tierList={tierList}
          companyList={companyList}
          subfieldList={subfieldList}
          onOpenCalendarSync={() => setIsCalendarSyncOpen(true)}
          onOpenSkillPicker={() => setIsSkillPickerOpen(true)}
          userSkillsCount={userSkills.length}
          onlyMatchingSkills={onlyMatchingSkills}
          onToggleMatchingSkills={() => setOnlyMatchingSkills(!onlyMatchingSkills)}
        />

        {/* Main Content Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-xs gap-3">
            <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono">Loading verified listings...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center bg-[#111620] rounded-xl border border-slate-800 p-8 space-y-3">
            <Compass className="w-10 h-10 mx-auto text-slate-600" />
            <h3 className="text-sm font-bold text-white">No opportunities match the selected filters</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Try adjusting your category, computer science field, or search terms, or trigger a scraper crawl.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={() => {
                  setSelectedType('all');
                  setSelectedTier('all');
                  setSelectedSubfield('all');
                  setSelectedSociety('all');
                  setSelectedFormat('all');
                  setSelectedCompany('all');
                  setSearchQuery('');
                  setOnlyStarred(false);
                  setOnlyAttending(false);
                  setOnlyMatchingSkills(false);
                }}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        ) : viewMode === 'calendar' ? (
          <CalendarView opportunities={filtered} onRefresh={fetchOpportunities} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(item => {
              const collision = getOpportunityCollision(item.id, collisionClusters);
              return (
                <OpportunityCard
                  key={item.id}
                  opportunity={item}
                  userSkills={userSkills}
                  isCollision={!!collision}
                  collisionSeverity={collision?.severity}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Feature #2: iCalendar & WebCal Subscription Modal */}
      <CalendarSubscriptionModal
        isOpen={isCalendarSyncOpen}
        onClose={() => setIsCalendarSyncOpen(false)}
        savedOpportunityIds={opportunities
          .filter(o => getAllInteractions()[o.id]?.starred)
          .map(o => o.id)}
      />

      {/* Feature #7: Skill & Tech Stack Picker Modal */}
      <SkillPickerModal
        isOpen={isSkillPickerOpen}
        onClose={() => setIsSkillPickerOpen(false)}
        onSkillsUpdated={skills => setUserSkills(skills)}
      />

      {/* Polished Footer */}
      <footer className="border-t border-slate-800/80 py-5 text-xs text-slate-500 bg-[#0c1015] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Opportunity Radar</span>
            <span>·</span>
            <span>All listings derived from real source adapters at runtime.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>Conferences: {stats.conference}</span>
            <span>Jobs: {stats.job}</span>
            <span>Hackathons: {stats.hackathon}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
