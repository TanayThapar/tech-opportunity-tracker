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
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Terminal,
  ExternalLink,
  Star,
  UserCheck,
  MessageSquare,
  Calendar as CalendarIcon,
  ListFilter,
} from 'lucide-react';
import { TypeBadge, TierBadge, CATEGORY_COLORS } from './Badge';
import { getInteraction } from '@/lib/interactions';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarViewProps {
  opportunities: TechOpportunity[];
}

export default function CalendarView({ opportunities }: CalendarViewProps) {
  // Determine earliest active opportunity month or fallback to current month
  const initialMonth = useMemo(() => {
    if (!opportunities || opportunities.length === 0) return new Date();
    // Sort by start date to find upcoming / current opportunities
    const sorted = [...opportunities].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
    try {
      return parseISO(sorted[0].start_date);
    } catch {
      return new Date();
    }
  }, [opportunities]);

  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  /**
   * Evaluates if event is active on a given day:
   * Works accurately with ISO YYYY-MM-DD strings in local timezone.
   */
  const getDayEvents = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');

    return opportunities.filter(event => {
      try {
        const startStr = event.start_date.split('T')[0];
        const endStr = event.end_date.split('T')[0];
        return dayStr >= startStr && dayStr <= endStr;
      } catch {
        return false;
      }
    });
  };

  // Distinct months that contain opportunities for instant quick-jump
  const availableMonths = useMemo(() => {
    const map = new Map<string, { label: string; date: Date; count: number }>();
    opportunities.forEach(o => {
      try {
        const d = parseISO(o.start_date);
        const key = format(d, 'yyyy-MM');
        const existing = map.get(key);
        if (existing) {
          existing.count++;
        } else {
          map.set(key, { label: format(d, 'MMM yyyy'), date: startOfMonth(d), count: 1 });
        }
      } catch {}
    });
    return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [opportunities]);

  const selectedDateEvents = selectedDate ? getDayEvents(selectedDate) : [];

  // Month-wide events list
  const currentMonthEvents = useMemo(() => {
    const mStart = format(monthStart, 'yyyy-MM-dd');
    const mEnd = format(monthEnd, 'yyyy-MM-dd');
    return opportunities.filter(event => {
      const s = event.start_date.split('T')[0];
      const e = event.end_date.split('T')[0];
      return s <= mEnd && e >= mStart;
    });
  }, [opportunities, monthStart, monthEnd]);

  return (
    <div className="bg-[#090e13] border border-zinc-800 rounded-xl overflow-hidden font-mono shadow-2xl space-y-0">
      {/* Terminal Title Bar */}
      <div className="bg-[#0f1720] border-b border-zinc-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-zinc-400 font-mono pl-2 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>sys/calendar --month {format(currentMonth, 'yyyy-MM')}</span>
          </span>
        </div>

        {/* Month Navigation & Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/60 transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/50 rounded">
            {format(currentMonth, 'MMMM yyyy').toUpperCase()}
          </span>

          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/60 transition-colors"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Jump to Event Months Bar */}
      {availableMonths.length > 0 && (
        <div className="bg-[#0b1218] px-4 py-2 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-none">
          <span className="text-zinc-500 font-semibold uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
            <CalendarIcon className="w-3 h-3 text-cyan-400" />
            <span>JUMP_TO_MONTH:</span>
          </span>
          <div className="flex items-center gap-1.5">
            {availableMonths.map(m => {
              const isActive = isSameMonth(m.date, currentMonth);
              return (
                <button
                  key={m.label}
                  onClick={() => {
                    setCurrentMonth(m.date);
                    setSelectedDate(null);
                  }}
                  className={`px-2 py-0.5 rounded border transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-600 text-black font-bold border-emerald-400'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  {m.label} ({m.count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Legend Bar */}
      <div className="bg-[#0b1218] px-4 py-2 border-b border-zinc-800/80 flex flex-wrap items-center justify-between text-[11px] text-zinc-400 gap-2">
        <span className="text-zinc-500 font-semibold uppercase tracking-wider">EVENT COLOR CODING:</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-purple-300">
            <span className="w-2.5 h-2.5 rounded-xs bg-purple-500 inline-block shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            Hackathons
          </span>
          <span className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-2.5 h-2.5 rounded-xs bg-cyan-400 inline-block shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            Conferences (Core A*/A/B)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400 inline-block shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            Workshops
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            Internships
          </span>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-zinc-800 bg-[#0c141c] text-center py-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
        <div>SUN</div>
        <div>MON</div>
        <div>TUE</div>
        <div>WED</div>
        <div>THU</div>
        <div>FRI</div>
        <div>SAT</div>
      </div>

      {/* Month Calendar Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-zinc-800/60 bg-[#080d12]">
        {days.map(day => {
          const dayEvents = getDayEvents(day);
          const isCurrMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

          return (
            <motion.div
              key={day.toISOString()}
              whileHover={{ scale: 1.008 }}
              transition={{ duration: 0.1 }}
              onClick={() => setSelectedDate(day)}
              className={`min-h-[110px] sm:min-h-[135px] p-2 transition-all cursor-pointer flex flex-col justify-between ${
                !isCurrMonth ? 'opacity-25 bg-[#05080c]' : 'bg-[#090e13]'
              } ${isSelected ? 'ring-2 ring-emerald-400 bg-emerald-950/20 z-10' : 'hover:bg-[#0f1720]'}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-mono font-bold w-6 h-6 flex items-center justify-center rounded ${
                    isToday
                      ? 'bg-emerald-500 text-black font-extrabold shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                      : isSelected
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-400'
                  }`}
                >
                  {format(day, 'd')}
                </span>

                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-emerald-500/40 shadow-xs">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event items in day cell with explicit hyperlinks & category color coding */}
              <div className="mt-1 space-y-1 overflow-hidden">
                {dayEvents.slice(0, 3).map(evt => {
                  const cfg = CATEGORY_COLORS[evt.type] || CATEGORY_COLORS.hackathon;
                  const interaction = getInteraction(evt.id);

                  return (
                    <a
                      key={evt.id}
                      href={evt.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className={`group/link block truncate text-[10px] px-1.5 py-0.5 rounded border transition-all ${cfg.bg} ${cfg.text} ${cfg.border} hover:underline decoration-white underline-offset-2 flex items-center justify-between gap-1`}
                      title={`${evt.title} (${evt.organizer}) - Click to open source URL`}
                    >
                      <span className="truncate flex-1">
                        {interaction.participating ? '✓ ' : interaction.starred ? '★ ' : ''}
                        {evt.title}
                      </span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover/link:opacity-100 flex-shrink-0" />
                    </a>
                  );
                })}

                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-zinc-400 pl-1 font-semibold">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Day Agenda Drawer with Hyperlinks & Details */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 border-t border-zinc-800 bg-[#0a1016]"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-200 flex items-center gap-2">
                <span className="text-emerald-400">&gt;&gt;</span>
                <span>AGENDA: {format(selectedDate, 'EEEE, yyyy-MM-dd').toUpperCase()}</span>
                <span className="text-zinc-500 font-normal">
                  ({selectedDateEvents.length} active opportunities)
                </span>
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-[11px] text-zinc-500 hover:text-white"
              >
                [CLOSE]
              </button>
            </div>

            {selectedDateEvents.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-2">
                // No tech opportunities active on this specific date. Click on days with numeric badges to inspect.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedDateEvents.map(evt => {
                  const cfg = CATEGORY_COLORS[evt.type] || CATEGORY_COLORS.hackathon;
                  const interaction = getInteraction(evt.id);

                  return (
                    <div
                      key={evt.id}
                      className={`p-3 rounded bg-[#0d141b] border ${cfg.border} flex flex-col justify-between group`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <div className="flex items-center gap-1.5">
                            <TypeBadge type={evt.type} />
                            {evt.type === 'conference' && <TierBadge tier={evt.conference_tier} />}
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                            {interaction.starred && (
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            )}
                            {interaction.participating && (
                              <span className="text-[10px] text-emerald-400 font-bold border border-emerald-500/50 px-1 rounded">
                                ATTENDING
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Clickable Hyperlink */}
                        <a
                          href={evt.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-xs sm:text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors flex items-start justify-between gap-1.5 hover:underline"
                        >
                          <span>{evt.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 flex-shrink-0 mt-0.5" />
                        </a>

                        <div className="text-[11px] text-zinc-400 mt-1 space-y-0.5">
                          <div>
                            <span className="text-zinc-600">ORG:</span> {evt.organizer}
                          </div>
                          <div>
                            <span className="text-zinc-600">DATES:</span> {evt.start_date} → {evt.end_date}
                          </div>
                          <div>
                            <span className="text-zinc-600">FMT:</span> [{evt.format}]
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                        <a
                          href={evt.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
                        >
                          <span>VIEW REGISTRATION LINK</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        {interaction.comments && interaction.comments.length > 0 && (
                          <span className="text-zinc-500 text-[11px] flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {interaction.comments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Month-Wide Summary Agenda List Below Grid */}
      <div className="p-4 border-t border-zinc-800 bg-[#070c10]">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <ListFilter className="w-3.5 h-3.5 text-emerald-400" />
            <span>OPPORTUNITIES SCHEDULED IN {format(currentMonth, 'MMMM yyyy').toUpperCase()}</span>
            <span className="text-zinc-500 font-normal">({currentMonthEvents.length} events)</span>
          </h3>
        </div>

        {currentMonthEvents.length === 0 ? (
          <div className="text-xs text-zinc-500 italic py-2">
            No events scheduled for {format(currentMonth, 'MMMM yyyy')}. Use the "JUMP_TO_MONTH" bar above to browse months with upcoming hackathons and conferences.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {currentMonthEvents.map(evt => {
              const cfg = CATEGORY_COLORS[evt.type] || CATEGORY_COLORS.hackathon;
              return (
                <div
                  key={evt.id}
                  className={`p-2.5 rounded bg-[#090e13] border ${cfg.border} flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <TypeBadge type={evt.type} />
                      {evt.type === 'conference' && <TierBadge tier={evt.conference_tier} />}
                    </div>
                    <a
                      href={evt.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-xs text-zinc-100 hover:text-emerald-400 flex items-center justify-between gap-1 group"
                    >
                      <span className="truncate">{evt.title}</span>
                      <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400 flex-shrink-0" />
                    </a>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      {evt.start_date} → {evt.end_date} • {evt.organizer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
