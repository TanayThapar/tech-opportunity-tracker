'use client';

import React, { useState } from 'react';
import { OpportunityType, OpportunityFormat } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { PlusCircle, X, Terminal, ExternalLink, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SubmitOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function SubmitOpportunityModal({
  isOpen,
  onClose,
  onSubmitted,
}: SubmitOpportunityModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<OpportunityType>('hackathon');
  const [conferenceTier, setConferenceTier] = useState('Core A*');
  const [organizer, setOrganizer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState<OpportunityFormat>('online');
  const [location, setLocation] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const user = getCurrentUser();

    try {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type,
          conference_tier: type === 'conference' ? conferenceTier : null,
          organizer,
          start_date: startDate,
          end_date: endDate,
          format,
          location: format !== 'online' ? location : null,
          source_url: sourceUrl,
          description,
          submitted_by: user?.handle || 'live_user',
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Submission failed');
        setSubmitting(false);
        return;
      }

      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-[#0b1016] border border-zinc-800 rounded-xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <Terminal className="w-4 h-4" />
            <span>SUBMIT_LIVE_OPPORTUNITY // USER_INPUT</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded bg-rose-950/50 border border-rose-500/60 text-rose-300 text-xs">
            // ERROR: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1">EVENT TITLE *</label>
            <input
              type="text"
              required
              placeholder="e.g. NeurIPS 2027, HackMIT 2026, Google SWE Internship"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1">CATEGORY *</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as OpportunityType)}
                className="w-full px-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="hackathon">Hackathon</option>
                <option value="conference">Conference</option>
                <option value="workshop">Workshop</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            {type === 'conference' ? (
              <div>
                <label className="block text-zinc-400 mb-1">CONFERENCE TIER</label>
                <select
                  value={conferenceTier}
                  onChange={e => setConferenceTier(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-purple-300 font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="Core A*">Core A*</option>
                  <option value="Core A">Core A</option>
                  <option value="Core B">Core B</option>
                  <option value="Core C">Core C</option>
                  <option value="Tier 1 Industry">Tier 1 Industry</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-zinc-400 mb-1">FORMAT</label>
                <select
                  value={format}
                  onChange={e => setFormat(e.target.value as OpportunityFormat)}
                  className="w-full px-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="online">Online</option>
                  <option value="in-person">In-Person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1">ORGANIZER / COMPANY *</label>
              <input
                type="text"
                required
                placeholder="e.g. IEEE, MIT TechX, Google, Meta"
                value={organizer}
                onChange={e => setOrganizer(e.target.value)}
                className="w-full px-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {format !== 'online' && (
              <div>
                <label className="block text-zinc-400 mb-1">LOCATION</label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco, CA / London, UK"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1">START DATE *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">
                {type === 'internship' ? 'APPLICATION DEADLINE *' : 'END DATE *'}
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">SOURCE URL (MANDATORY VERIFIED LINK) *</label>
            <input
              type="url"
              required
              placeholder="https://example.com/registration or official careers page"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              className="w-full px-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-emerald-300 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">SHORT DESCRIPTION (2-3 SENTENCES)</label>
            <textarea
              rows={3}
              placeholder="Provide context, tracks, eligibility criteria, or bounty details..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#080c10] border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-zinc-900 text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-black font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'RECORDING...' : 'PUBLISH_LIVE_OPPORTUNITY'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
