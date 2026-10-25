'use client';

import React, { useState } from 'react';
import { X, Calendar, Copy, Check, ExternalLink, Download, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedOpportunityIds?: string[];
}

export default function CalendarSubscriptionModal({
  isOpen,
  onClose,
  savedOpportunityIds = [],
}: CalendarSubscriptionModalProps) {
  const [filterPreset, setFilterPreset] = useState<'all' | 'saved' | 'acm_ieee' | 'conferences'>('all');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tech-opportunity-tracker.vercel.app';

  // Construct query string for feed
  let queryParams = '';
  if (filterPreset === 'saved' && savedOpportunityIds.length > 0) {
    queryParams = `?ids=${savedOpportunityIds.join(',')}&name=My%20Saved%20Deadlines`;
  } else if (filterPreset === 'acm_ieee') {
    queryParams = '?society=acm_ieee&name=ACM%20and%20IEEE%20Deadlines';
  } else if (filterPreset === 'conferences') {
    queryParams = '?type=conference,workshop&name=Conferences%20and%20Workshops';
  }

  // Use /api/calendar/feed.ics so Google Calendar and client importers see the .ics extension
  const httpsFeedUrl = `${baseUrl}/api/calendar/feed.ics${queryParams}`;
  const webcalUrl = httpsFeedUrl.replace(/^https?:\/\//, 'webcal://');

  // Google Calendar import link (Google Calendar requires valid HTTPS/HTTP URL, not webcal://)
  const googleCalendarDirectUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(httpsFeedUrl)}`;
  const googleCalendarManualSettingsUrl = 'https://calendar.google.com/calendar/u/0/r/settings/addbyurl';

  const handleCopy = () => {
    navigator.clipboard.writeText(httpsFeedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-[#111620] text-slate-100 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0c1015]">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Calendar className="w-4 h-4 text-lime-400" />
              <span>Subscribe via WebCal / iCalendar (.ics)</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Subscribe once to receive real-time updates and alarms in <strong>Google Calendar</strong>,{' '}
              <strong>Apple Calendar</strong>, or <strong>Outlook</strong> whenever conference dates or deadlines change.
            </p>

            {/* Filter Presets */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Choose Calendar Feed:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterPreset('all')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    filterPreset === 'all'
                      ? 'border-lime-400 bg-lime-950/40 text-lime-200'
                      : 'border-slate-800 bg-[#0c1015] text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-white">All Opportunities</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Conferences, jobs, hackathons</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterPreset('saved')}
                  disabled={savedOpportunityIds.length === 0}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    filterPreset === 'saved'
                      ? 'border-lime-400 bg-lime-950/40 text-lime-200'
                      : 'border-slate-800 bg-[#0c1015] text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-white">
                    My Watchlist Only ({savedOpportunityIds.length})
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Your bookmarked events</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterPreset('acm_ieee')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    filterPreset === 'acm_ieee'
                      ? 'border-sky-400 bg-sky-950/40 text-sky-200'
                      : 'border-slate-800 bg-[#0c1015] text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-white">ACM & IEEE Events</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">All flagship societies</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterPreset('conferences')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    filterPreset === 'conferences'
                      ? 'border-purple-400 bg-purple-950/40 text-purple-200'
                      : 'border-slate-800 bg-[#0c1015] text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-white">Conferences & Workshops</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Academic submissions only</p>
                </button>
              </div>
            </div>

            {/* Subscription Link & Action Buttons */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <span>Calendar Feed URL (.ics):</span>
                <span className="text-[10px] text-lime-400 lowercase font-mono">https & webcal supported</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={httpsFeedUrl}
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-slate-700 bg-[#0c1015] text-slate-300 focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied URL!' : 'Copy Feed'}</span>
                </button>
              </div>
            </div>

            {/* Quick 1-Click Subscribe Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <a
                href={googleCalendarDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all text-center shadow-sm cursor-pointer"
              >
                <span>Add to Google Calendar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href={webcalUrl}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-lime-400" />
                <span>Subscribe in Apple / Default</span>
              </a>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
              <a
                href={httpsFeedUrl}
                download="tech-opportunities.ics"
                className="hover:text-lime-400 transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>Download offline .ICS file</span>
              </a>

              <a
                href={googleCalendarManualSettingsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors flex items-center gap-1"
              >
                <span>Google Calendar Settings ("From URL") ➔</span>
              </a>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0c1015] border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1">
              <p>
                <strong>Google Calendar Tips:</strong>
              </p>
              <p>
                • Click <strong>"Add to Google Calendar"</strong> for automatic 1-click subscription.
              </p>
              <p>
                • Or click <strong>"Copy Feed"</strong> ➔ open Google Calendar ➔ next to <em>Other calendars</em> click <strong>+</strong> ➔ choose <strong>From URL</strong> ➔ paste link.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
