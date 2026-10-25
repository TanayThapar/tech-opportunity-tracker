'use client';

import React, { useState, useMemo } from 'react';
import { TechOpportunity } from '@/types';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  parseISO,
  startOfWeek,
  endOfWeek,
  differenceInDays,
  isToday,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Star,
  UserCheck,
  Bell,
  BellOff,
  Users,
  Clock,
  MapPin,
  CalendarDays,
  CalendarPlus,
  X,
  Bookmark,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { TypeBadge, TierBadge, SocietyBadge, CATEGORY_COLORS } from './Badge';
import { detectSocieties } from '@/lib/societyUtils';
import { getInteraction, toggleStar, toggleParticipating, toggleReminder } from '@/lib/interactions';
import { getCurrentUser } from '@/lib/auth';
import { createGoogleCalendarEventUrl } from '@/lib/ical';
import { motion, AnimatePresence } from 'motion/react';
import ContributorModal from './ContributorModal';

interface CalendarViewProps {
  opportunities: TechOpportunity[];
  onRefresh?: () => void;
}

// Event pill height classes
const TYPE_PILL: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  conference: { bg: 'bg-cyan-600/90', text: 'text-white font-medium', border: 'border-cyan-400/40', dot: 'bg-cyan-400' },
  job:        { bg: 'bg-amber-600/90', text: 'text-white font-medium', border: 'border-amber-400/40', dot: 'bg-amber-400' },
  hackathon:  { bg: 'bg-lime-500/90', text: 'text-slate-950 font-bold', border: 'border-lime-400/40', dot: 'bg-lime-400' },
  workshop:   { bg: 'bg-purple-600/90', text: 'text-white font-medium', border: 'border-purple-400/40', dot: 'bg-purple-400' },
  internship: { bg: 'bg-amber-500/90', text: 'text-slate-950 font-bold', border: 'border-amber-400/40', dot: 'bg-amber-400' },
  deadline:   { bg: 'bg-rose-600/90', text: 'text-white font-medium', border: 'border-rose-400/40', dot: 'bg-rose-400' },
};

function getDaysUntil(dateStr: string): number {
  try {
    const d = parseISO(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    return differenceInDays(d, today);
  } catch { return 999; }
}

function safeFormatDate(dateStr?: string | null, formatStr: string = 'MMM d, yyyy'): string {
  if (!dateStr) return 'No deadline listed';
  try {
    return format(parseISO(dateStr), formatStr);
  } catch {
    return dateStr;
  }
}

function UrgencyBadge({ daysUntil, label }: { daysUntil: number; label: string }) {
  if (daysUntil < 0) return null;
  const color = daysUntil <= 1 ? 'bg-red-500 text-white animate-pulse' : daysUntil <= 7 ? 'bg-orange-500 text-white' : 'bg-yellow-600/80 text-white';
  const text = daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `${daysUntil}d`;
  return (
    <span className={`text-[9px] font-black px-1 py-0.5 rounded ${color}`}>
      {label} {text}
    </span>
  );
}

export default function CalendarView({ opportunities, onRefresh }: CalendarViewProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(today);
  const [selectedEvent, setSelectedEvent] = useState<TechOpportunity | null>(null);
  const [interactionVer, setInteractionVer] = useState(0);
  const [showContributorModal, setShowContributorModal] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);

  // Directory filter & sort state
  const [directoryCategory, setDirectoryCategory] = useState<string>('all');
  const [directorySearch, setDirectorySearch] = useState<string>('');
  const [directorySort, setDirectorySort] = useState<'date' | 'deadline' | 'title'>('date');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const refreshInteractions = () => setInteractionVer(v => v + 1);

  /**
   * Returns events for a given day:
   * - conferences/hackathons/workshops: span start_date → end_date
   * - internships & jobs: show on start_date
   * - submission or application deadlines: also show a "CFP/App Deadline" marker on that day
   */
  const getDayEvents = (day: Date): { event: TechOpportunity; isDeadline?: boolean; isStart?: boolean }[] => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const results: { event: TechOpportunity; isDeadline?: boolean; isStart?: boolean }[] = [];

    for (const event of opportunities) {
      try {
        const startStr = (event.start_date || '').split('T')[0];
        const endStr = (event.end_date || event.start_date || '').split('T')[0];

        if (!startStr) continue;

        if (event.type === 'internship' || event.type === 'job') {
          // Internships & Jobs: show on their start/posted date
          if (dayStr === startStr) {
            results.push({ event, isStart: true });
          }
        } else {
          // Conferences, Hackathons, Workshops: show across span
          if (dayStr >= startStr && dayStr <= endStr) {
            results.push({ event, isStart: dayStr === startStr });
          }
        }

        // Submission or Application deadline marker
        const deadline = event.submission_deadline || event.application_deadline;
        if (deadline) {
          const dlStr = deadline.split('T')[0];
          if (dayStr === dlStr) {
            results.push({ event, isDeadline: true });
          }
        }
      } catch {}
    }
    return results;
  };

  const currentMonthEvents = useMemo(() => {
    const mStart = format(monthStart, 'yyyy-MM-dd');
    const mEnd = format(monthEnd, 'yyyy-MM-dd');
    return opportunities.filter(event => {
      try {
        const s = (event.start_date || '').split('T')[0];
        const e = (event.end_date || event.start_date || '').split('T')[0];
        return s <= mEnd && e >= mStart;
      } catch {
        return false;
      }
    });
  }, [opportunities, monthStart, monthEnd]);

  // Filtered list for the Upcoming Directory
  const filteredDirectoryList = useMemo(() => {
    return opportunities
      .filter(item => {
        if (directoryCategory !== 'all' && item.type !== directoryCategory) return false;
        if (directorySearch.trim()) {
          const q = directorySearch.toLowerCase();
          const titleMatch = item.title.toLowerCase().includes(q);
          const orgMatch = item.organizer.toLowerCase().includes(q);
          const compMatch = (item.company || '').toLowerCase().includes(q);
          const tierMatch = (item.conference_tier || '').toLowerCase().includes(q);
          if (!titleMatch && !orgMatch && !compMatch && !tierMatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (directorySort === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (directorySort === 'deadline') {
          const dlA = a.submission_deadline || a.application_deadline || '9999-99-99';
          const dlB = b.submission_deadline || b.application_deadline || '9999-99-99';
          return dlA.localeCompare(dlB);
        }
        const dateA = a.start_date || '9999-99-99';
        const dateB = b.start_date || '9999-99-99';
        return dateA.localeCompare(dateB);
      });
  }, [opportunities, directoryCategory, directorySearch, directorySort]);

  const handleEventClick = (event: TechOpportunity, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
  };

  const currentUser = getCurrentUser();

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700/50">
      {/* ── Google Calendar-style Toolbar ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <select
            value={format(currentMonth, 'yyyy-MM')}
            onChange={e => {
              const [y, m] = e.target.value.split('-').map(Number);
              setCurrentMonth(new Date(y, m - 1, 1));
            }}
            className="text-base font-bold bg-transparent text-gray-900 dark:text-white border-b border-dashed border-gray-400 dark:border-gray-600 focus:outline-none focus:border-blue-500 py-0.5 cursor-pointer"
            title="Jump directly to any month in 2026 or 2027"
          >
            <option value="2026-10" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">October 2026</option>
            <option value="2026-11" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">November 2026</option>
            <option value="2026-12" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">December 2026</option>
            <option value="2027-01" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">January 2027</option>
            <option value="2027-02" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">February 2027</option>
            <option value="2027-03" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">March 2027</option>
            <option value="2027-04" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">April 2027</option>
            <option value="2027-05" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">May 2027</option>
            <option value="2027-06" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">June 2027</option>
            <option value="2027-07" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">July 2027</option>
            <option value="2027-08" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">August 2027</option>
            <option value="2027-09" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">September 2027</option>
            <option value="2027-10" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">October 2027</option>
            <option value="2027-11" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">November 2027</option>
            <option value="2027-12" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">December 2027</option>
          </select>
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh calendar opportunities"
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-600 transition-colors cursor-pointer ml-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[11px]">
          {(['hackathon', 'conference', 'job', 'workshop', 'internship'] as const).map(t => (
            <span key={t} className="flex items-center gap-1 text-gray-600 dark:text-gray-400 capitalize">
              <span className={`w-2 h-2 rounded-sm ${TYPE_PILL[t].bg}`} />
              {t}s
            </span>
          ))}
          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <span className="w-2 h-2 rounded-sm bg-red-600" />
            CFP Deadline
          </span>
        </div>
      </div>

      {/* ── Weekday Header ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 flex-1 bg-white dark:bg-gray-900">
        {days.map((day, idx) => {
          const dayEntries = getDayEvents(day);
          const inMonth = isSameMonth(day, currentMonth);
          const todayFlag = isToday(day);
          const isSelected = selectedDayDate ? isSameDay(day, selectedDayDate) : false;

          return (
            <div
              key={day.toISOString()}
              onClick={() => setSelectedDayDate(isSameDay(day, selectedDayDate || new Date(0)) ? null : day)}
              className={`
                min-h-[110px] sm:min-h-[130px] p-1 border-b border-r border-gray-100 dark:border-gray-800 cursor-pointer transition-colors relative
                ${!inMonth ? 'bg-gray-50/60 dark:bg-gray-900/40' : 'bg-white dark:bg-gray-900 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'}
                ${isSelected ? 'ring-2 ring-inset ring-blue-500' : ''}
                ${idx % 7 === 0 ? 'border-l' : ''}
              `}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`
                    text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors
                    ${todayFlag ? 'bg-blue-600 text-white' : inMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-300 dark:text-gray-600'}
                  `}
                >
                  {format(day, 'd')}
                </span>
                {dayEntries.length > 0 && (
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 pr-0.5">
                    {dayEntries.length}
                  </span>
                )}
              </div>

              {/* Event pills */}
              <div className="space-y-0.5 overflow-hidden">
                {dayEntries.slice(0, 3).map((entry, ei) => {
                  const { event, isDeadline, isStart } = entry;
                  const cfg = isDeadline ? TYPE_PILL.deadline : TYPE_PILL[event.type] || TYPE_PILL.hackathon;
                  const label = isDeadline
                    ? `⏳ CFP: ${event.title}`
                    : event.type === 'internship'
                    ? `📌 ${event.title}`
                    : event.title;
                  const interaction = getInteraction(event.id);

                  return (
                    <button
                      key={`${event.id}-${isDeadline ? 'dl' : 'ev'}-${ei}`}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className={`
                        w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1
                        ${cfg.bg} ${cfg.text} hover:opacity-90 transition-opacity
                        ${isStart && !isDeadline ? 'rounded-l-full' : ''}
                      `}
                      title={label}
                    >
                      {interaction.participating && !isDeadline && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/80 flex-shrink-0" />
                      )}
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
                {dayEntries.length > 3 && (
                  <button
                    onClick={e => { e.stopPropagation(); setSelectedDayDate(day); }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-medium pl-1 hover:underline"
                  >
                    +{dayEntries.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── This Month Summary ──────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" />
          {format(currentMonth, 'MMMM yyyy')} — {currentMonthEvents.length} events
        </h3>
        {currentMonthEvents.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No events this month. Navigate with arrows or add one.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {currentMonthEvents.map(evt => {
              const cfg = CATEGORY_COLORS[evt.type] || CATEGORY_COLORS.hackathon;
              const daysToStart = getDaysUntil(evt.start_date);
              const daysToDeadline = evt.submission_deadline ? getDaysUntil(evt.submission_deadline) : null;
              return (
                <button
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  className={`text-left p-2.5 rounded-xl border ${cfg.border} bg-white dark:bg-gray-900 hover:shadow-md transition-all group`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <TypeBadge type={evt.type} />
                    {evt.type === 'conference' && <TierBadge tier={evt.conference_tier} />}
                  </div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                    {evt.title}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {evt.type === 'internship' ? '📌 Opens: ' : evt.type === 'job' ? '💼 Posted: ' : ''}{safeFormatDate(evt.start_date, 'MMM d')}
                    {evt.type !== 'internship' && evt.type !== 'job' && evt.end_date && ` → ${safeFormatDate(evt.end_date, 'MMM d')}`}
                  </p>
                  {daysToStart >= 0 && daysToStart <= 14 && evt.type !== 'internship' && evt.type !== 'job' && (
                    <UrgencyBadge daysUntil={daysToStart} label="Starts" />
                  )}
                  {daysToDeadline !== null && daysToDeadline >= 0 && daysToDeadline <= 14 && (
                    <UrgencyBadge daysUntil={daysToDeadline} label="Deadline" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Upcoming Opportunities Directory by Category & Respective Dates ─── */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              <span>Upcoming Opportunities Directory ({filteredDirectoryList.length})</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Comprehensive list of Hackathons, Conferences, Jobs, Workshops, and Internships with respective event and deadline dates.
            </p>
          </div>

          {/* Quick Refresh Button in Directory */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
              <span>Refresh Listings</span>
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {([
            { id: 'all', label: 'All Opportunities', count: opportunities.length },
            { id: 'conference', label: 'Conferences', count: opportunities.filter(o => o.type === 'conference').length },
            { id: 'hackathon', label: 'Hackathons', count: opportunities.filter(o => o.type === 'hackathon').length },
            { id: 'job', label: 'Jobs', count: opportunities.filter(o => o.type === 'job').length },
            { id: 'workshop', label: 'Workshops', count: opportunities.filter(o => o.type === 'workshop').length },
            { id: 'internship', label: 'Internships', count: opportunities.filter(o => o.type === 'internship').length },
          ] as const).map(tab => {
            const isSelected = directoryCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDirectoryCategory(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-blue-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort within directory */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search category, title, or employer..."
              value={directorySearch}
              onChange={e => setDirectorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-gray-500">
            <span>Sort by:</span>
            <select
              value={directorySort}
              onChange={e => setDirectorySort(e.target.value as any)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
            >
              <option value="date">Event Start Date</option>
              <option value="deadline">Application / CFP Deadline</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* List of Opportunities with Respective Dates */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800/80 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
          {filteredDirectoryList.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No matching opportunities in this category.
            </div>
          ) : (
            filteredDirectoryList.map(item => {
              const interaction = getInteraction(item.id);
              const hasEndDate = item.end_date && item.end_date.trim().length > 0;
              const deadline = item.submission_deadline || item.application_deadline;
              const daysToStart = getDaysUntil(item.start_date);
              const daysToDeadline = deadline ? getDaysUntil(deadline) : null;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedEvent(item)}
                  className="p-3.5 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer group"
                >
                  {/* Left: Badges + Title + Details */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <TypeBadge type={item.type} />
                      {item.type === 'conference' && item.conference_tier && (
                        <TierBadge tier={item.conference_tier} />
                      )}
                      {(item.company || (item.type === 'job' && item.organizer)) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {item.company || item.organizer}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                        [{item.format}]
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>Org: {item.organizer}</span>
                      {item.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span>{item.location}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Respective Dates + Deadlines + Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100 dark:border-gray-800">
                    <div className="text-left sm:text-right space-y-1 shrink-0">
                      {/* Event Duration Dates */}
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-200 flex sm:justify-end items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                        <span>
                          {item.type === 'internship' ? 'Opens: ' : item.type === 'job' ? 'Posted: ' : 'Dates: '}
                          {safeFormatDate(item.start_date, 'MMM d, yyyy')}
                          {hasEndDate && item.type !== 'internship' && item.type !== 'job' && (
                            <> → {safeFormatDate(item.end_date, 'MMM d, yyyy')}</>
                          )}
                        </span>
                      </div>

                      {/* Application / CFP Deadline */}
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 flex sm:justify-end items-center gap-1.5">
                        <Clock className="w-3 h-3 text-orange-500" />
                        <span>
                          {item.type === 'conference' ? 'CFP Due: ' : 'Application Deadline: '}
                          <strong className="text-gray-700 dark:text-gray-300">
                            {deadline ? safeFormatDate(deadline, 'MMM d, yyyy') : 'No deadline listed (Rolling)'}
                          </strong>
                        </span>
                      </div>

                      {/* Urgency indicators */}
                      <div className="flex sm:justify-end gap-1.5 pt-0.5">
                        {daysToStart >= 0 && daysToStart <= 14 && (
                          <UrgencyBadge daysUntil={daysToStart} label="Starts" />
                        )}
                        {daysToDeadline !== null && daysToDeadline >= 0 && daysToDeadline <= 14 && (
                          <UrgencyBadge daysUntil={daysToDeadline} label="Deadline" />
                        )}
                      </div>
                    </div>

                    {/* Action buttons: Star, Attending, Source Link */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { toggleStar(item.id); refreshInteractions(); }}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          interaction.starred
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600 text-amber-500'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-amber-500'
                        }`}
                        title={interaction.starred ? 'Starred' : 'Star this event'}
                      >
                        <Star className={`w-3.5 h-3.5 ${interaction.starred ? 'fill-amber-500' : ''}`} />
                      </button>

                      <button
                        onClick={() => { toggleParticipating(item.id); refreshInteractions(); }}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          interaction.participating
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-600 text-blue-600'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-blue-500'
                        }`}
                        title={interaction.participating ? 'Marked Attending' : 'Mark as Attending'}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                      </button>

                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-blue-600 hover:border-blue-400 transition-colors"
                          title="Open official organizer source page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Event Detail Popover / Side Panel ──────────────────────────────── */}
      <AnimatePresence>
        {selectedEvent && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 60, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[480px] bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 overflow-y-auto"
            >
              <EventDetailPanel
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
                onRefresh={refreshInteractions}
                onOpenContributors={() => setShowContributorModal(true)}
                currentUser={currentUser}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Contributor Modal ───────────────────────────────────────────────── */}
      {showContributorModal && selectedEvent && (
        <ContributorModal
          event={selectedEvent}
          onClose={() => setShowContributorModal(false)}
          onSaved={() => { setShowContributorModal(false); onRefresh?.(); }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Event Detail Panel
// ──────────────────────────────────────────────────────────────────────────────
function EventDetailPanel({
  event,
  onClose,
  onRefresh,
  onOpenContributors,
  currentUser,
}: {
  event: TechOpportunity;
  onClose: () => void;
  onRefresh: () => void;
  onOpenContributors: () => void;
  currentUser: ReturnType<typeof getCurrentUser>;
}) {
  const [interaction, setInteraction] = React.useState(() => getInteraction(event.id));
  const cfg = TYPE_PILL[event.type] || TYPE_PILL.hackathon;
  const daysToStart = getDaysUntil(event.start_date);
  const daysToDeadline = event.submission_deadline ? getDaysUntil(event.submission_deadline) : null;

  const handleStar = () => {
    toggleStar(event.id);
    setInteraction(getInteraction(event.id));
    onRefresh();
  };
  const handleParticipate = () => {
    toggleParticipating(event.id);
    setInteraction(getInteraction(event.id));
    onRefresh();
  };
  const handleReminder = () => {
    toggleReminder(event.id);
    setInteraction(getInteraction(event.id));
    onRefresh();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header strip */}
      <div className={`${cfg.bg} px-5 py-4 flex items-start justify-between`}>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <TypeBadge type={event.type} />
            {event.type === 'conference' && <TierBadge tier={event.conference_tier} />}
            {detectSocieties(event).map(soc => (
              <SocietyBadge key={soc} society={soc} />
            ))}
          </div>
          <h2 className="text-base font-bold text-white leading-tight">{event.title}</h2>
          <p className="text-xs text-white/80 mt-0.5">{event.organizer}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors ml-3 mt-0.5 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-5 space-y-4 overflow-y-auto">
        {/* Urgency alerts */}
        {daysToStart !== null && daysToStart >= 0 && daysToStart <= 14 && event.type !== 'internship' && (
          <div className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-semibold
            ${daysToStart <= 1 ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700' :
              daysToStart <= 7 ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700' :
              'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700'}`}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Event starts {daysToStart === 0 ? 'TODAY!' : daysToStart === 1 ? 'TOMORROW!' : `in ${daysToStart} days`}
          </div>
        )}
        {daysToDeadline !== null && daysToDeadline >= 0 && daysToDeadline <= 14 && (
          <div className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-semibold
            ${daysToDeadline <= 1 ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700' :
              daysToDeadline <= 7 ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700' :
              'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700'}`}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            ⏳ CFP/Paper submission {daysToDeadline === 0 ? 'DUE TODAY!' : daysToDeadline === 1 ? 'DUE TOMORROW!' : `due in ${daysToDeadline} days`}
          </div>
        )}

        {/* Date details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-300">
            <CalendarDays className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              {event.type === 'internship' ? (
                <div>
                  <p className="font-medium">Applications Open: {format(parseISO(event.start_date), 'EEE, MMM d, yyyy')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Deadline: {format(parseISO(event.end_date), 'EEE, MMM d, yyyy')}</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">
                    {format(parseISO(event.start_date), 'EEE, MMM d')} – {format(parseISO(event.end_date), 'EEE, MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-gray-400">
                    {differenceInDays(parseISO(event.end_date), parseISO(event.start_date)) + 1} day(s)
                  </p>
                </div>
              )}
            </div>
          </div>

          {event.submission_deadline && (
            <div className="flex items-start gap-2.5 text-red-600 dark:text-red-400">
              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-xs uppercase tracking-wide">Paper/CFP Submission Deadline</p>
                <p className="font-medium">{format(parseISO(event.submission_deadline), 'EEE, MMM d, yyyy')}</p>
                {daysToDeadline !== null && daysToDeadline >= 0 && (
                  <p className="text-xs font-bold">{daysToDeadline === 0 ? 'DUE TODAY' : `${daysToDeadline} days remaining`}</p>
                )}
                {daysToDeadline !== null && daysToDeadline < 0 && (
                  <p className="text-xs text-gray-400">Submission period has passed</p>
                )}
              </div>
            </div>
          )}

          {event.location && (
            <div className="flex items-start gap-2.5 text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p>{event.location}</p>
            </div>
          )}

          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400">
            <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
              <span className={`w-2.5 h-2.5 rounded-sm ${cfg.bg}`} />
            </span>
            <span className="capitalize">{event.format}</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">About</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{event.description}</p>
        </div>

        {/* Actions row */}
        <div className="flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
          <button
            onClick={handleStar}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
              ${interaction.starred
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-amber-300'
              }`}
          >
            <Star className={`w-3.5 h-3.5 ${interaction.starred ? 'fill-amber-500 text-amber-500' : ''}`} />
            {interaction.starred ? 'Starred' : 'Star'}
          </button>

          <button
            onClick={handleParticipate}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
              ${interaction.participating
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
          >
            <UserCheck className={`w-3.5 h-3.5 ${interaction.participating ? 'text-blue-600' : ''}`} />
            {interaction.participating ? '✓ Participating' : 'Mark Attending'}
          </button>

          <button
            onClick={handleReminder}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
              ${interaction.reminderEnabled
                ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-300'
              }`}
          >
            {interaction.reminderEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            {interaction.reminderEnabled ? 'Reminder On' : 'Set Reminder'}
          </button>

          <button
            onClick={onOpenContributors}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 transition-all"
          >
            <Users className="w-3.5 h-3.5" />
            Contributors {event.contributors && event.contributors.length > 0 ? `(${event.contributors.length})` : ''}
          </button>

          <a
            href={createGoogleCalendarEventUrl(event, 'deadline')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all cursor-pointer"
            title="Add this opportunity / deadline to Google Calendar in 1 click"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-blue-500" />
            <span>Add to Google Calendar</span>
            <ExternalLink className="w-3 h-3 text-blue-400 ml-0.5" />
          </a>
        </div>

        {/* Contributors list */}
        {event.contributors && event.contributors.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Team / Contributors</p>
            <div className="flex flex-wrap gap-2">
              {event.contributors.map(c => (
                <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                    {(c.name?.[0] || c.handle?.[0] || '?').toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">@{c.handle}</span>
                  {c.role && <span className="text-[10px] text-gray-400">{c.role}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source link */}
        <a
          href={event.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          <Bookmark className="w-4 h-4" />
          Open Official Page
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
