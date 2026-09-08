'use client';

import React, { useState } from 'react';
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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { TypeBadge, TierBadge } from './Badge';

interface CalendarViewProps {
  opportunities: TechOpportunity[];
}

export default function CalendarView({ opportunities }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayEvents = (day: Date) => {
    return opportunities.filter(event => {
      try {
        const s = parseISO(event.start_date);
        const e = parseISO(event.end_date);
        const target = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
        const start = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
        const end = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();

        return target >= start && target <= end;
      } catch {
        return false;
      }
    });
  };

  const selectedDateEvents = selectedDate ? getDayEvents(selectedDate) : [];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Month Navigator Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Click any calendar day to inspect active hackathons, conferences, and deadlines
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 text-center py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/20">
        {days.map(day => {
          const dayEvents = getDayEvents(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

          return (
            <div
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`min-h-[90px] sm:min-h-[110px] p-2 transition-all cursor-pointer flex flex-col justify-between ${
                !isCurrentMonth ? 'opacity-40 bg-zinc-100/50 dark:bg-zinc-900/40' : 'bg-white dark:bg-zinc-900'
              } ${isSelected ? 'ring-2 ring-indigo-600 inset-0 z-10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isSelected
                      ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event indicators / dots */}
              <div className="mt-1 space-y-1 overflow-hidden">
                {dayEvents.slice(0, 2).map(evt => (
                  <div
                    key={evt.id}
                    className="truncate text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200 border-l-2 border-indigo-500 font-medium"
                    title={evt.title}
                  >
                    {evt.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 pl-1 font-medium">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Day Agenda Drawer */}
      {selectedDate && (
        <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/70">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <span>Events for {format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
              <span className="text-xs font-normal text-zinc-500">
                ({selectedDateEvents.length} active)
              </span>
            </h3>
          </div>

          {selectedDateEvents.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 py-3 italic">
              No tech opportunities or deadlines scheduled for this date.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedDateEvents.map(evt => (
                <div
                  key={evt.id}
                  className="p-3 bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 rounded-xl shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <TypeBadge type={evt.type} />
                      {evt.type === 'conference' && <TierBadge tier={evt.conference_tier} />}
                    </div>
                    <a
                      href={evt.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-between gap-1 group"
                    >
                      <span className="line-clamp-1">{evt.title}</span>
                      <ExternalLink className="w-3 h-3 text-zinc-400 opacity-70 group-hover:opacity-100 flex-shrink-0" />
                    </a>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                      {evt.organizer} • {evt.format}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
