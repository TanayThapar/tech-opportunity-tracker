'use client';

import React, { useState, useEffect } from 'react';
import { OpportunityType, OpportunityFormat } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { PlusCircle, X, Send, Sparkles, ExternalLink, KeyRound, CheckCircle2 } from 'lucide-react';
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
  const [type, setType] = useState<OpportunityType>('conference');
  const [conferenceTier, setConferenceTier] = useState('Core A*');
  const [organizer, setOrganizer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submissionDeadline, setSubmissionDeadline] = useState('');
  const [format, setFormat] = useState<OpportunityFormat>('in-person');
  const [location, setLocation] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Gemini AI Extraction State
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [aiExtractUrl, setAiExtractUrl] = useState('');
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('techradar_gemini_api_key');
      if (savedKey) setGeminiApiKey(savedKey);
    }
  }, []);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle(''); setType('conference'); setConferenceTier('Core A*');
    setOrganizer(''); setStartDate(''); setEndDate('');
    setSubmissionDeadline(''); setFormat('in-person');
    setLocation(''); setSourceUrl(''); setDescription('');
    setError(null); setSuccess(false);
    setAiFeedback(null); setAiExtractUrl('');
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSaveApiKey = (key: string) => {
    setGeminiApiKey(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('techradar_gemini_api_key', key);
    }
    setShowKeyConfig(false);
  };

  const handleAiAutoFill = async () => {
    if (!aiExtractUrl.trim()) return;
    setIsAiExtracting(true);
    setAiFeedback(null);
    setError(null);

    try {
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: geminiApiKey.trim() || undefined,
          url: aiExtractUrl.trim(),
        }),
      });

      const json = await res.json();
      if (!json.success || !json.data) {
        setAiFeedback({
          message: json.error || 'Failed to extract opportunity details with Gemini.',
          isError: true,
        });
        return;
      }

      const item = json.data;
      if (item.title) setTitle(item.title);
      if (item.type) setType(item.type);
      if (item.conference_tier) setConferenceTier(item.conference_tier);
      if (item.organizer) setOrganizer(item.organizer);
      if (item.start_date) setStartDate(item.start_date);
      if (item.end_date) setEndDate(item.end_date);
      if (item.submission_deadline) setSubmissionDeadline(item.submission_deadline);
      if (item.format) setFormat(item.format);
      if (item.location) setLocation(item.location);
      if (item.description) setDescription(item.description);
      setSourceUrl(aiExtractUrl.trim());

      setAiFeedback({
        message: 'Successfully auto-filled from page with Gemini! Please review details below before submitting.',
        isError: false,
      });
    } catch (err: any) {
      setAiFeedback({
        message: err.message || 'Network error communicating with AI extractor.',
        isError: true,
      });
    } finally {
      setIsAiExtracting(false);
    }
  };

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
          submission_deadline: (type === 'conference' && submissionDeadline) ? submissionDeadline : null,
          format,
          location: format !== 'online' ? location : null,
          source_url: sourceUrl,
          description,
          submitted_by: user?.handle || 'live_user',
          contributors: [],
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Submission failed');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSubmitted();
        handleClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-xl bg-[#111620] text-slate-100 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden max-h-[92vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0c1015]">
              <div className="flex items-center gap-2 text-white font-bold">
                <PlusCircle className="w-5 h-5 text-lime-400" />
                <span className="text-sm">Submit New Tech Opportunity</span>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {success ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 rounded-full bg-lime-950/80 border border-lime-500/50 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-lime-400" />
                </div>
                <p className="text-sm font-semibold text-white">Submission Queued for Review!</p>
                <p className="text-xs text-slate-400">Moderators will review before public publishing.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                    {error}
                  </div>
                )}

                {/* ── AI AUTO-FILL SECTION WITH GEMINI ───────────────────────── */}
                <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-950/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>AI Auto-Fill with Google Gemini</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowKeyConfig(!showKeyConfig)}
                      className="text-[11px] text-sky-400 hover:text-sky-200 underline cursor-pointer flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3" />
                      {geminiApiKey ? 'Change Gemini Key' : 'Add Gemini API Key'}
                    </button>
                  </div>

                  {/* Gemini API Key configuration box */}
                  {(showKeyConfig || !geminiApiKey) && (
                    <div className="space-y-1.5 p-2.5 rounded-lg bg-[#0c1015] border border-slate-800">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Gemini API Key:</span>
                        <a
                          href="https://aistudio.google.com/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 font-semibold underline flex items-center gap-1"
                        >
                          Get Free API Key (Google AI Studio) <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="Paste your Gemini API key (AIzaSy...)"
                          value={geminiApiKey}
                          onChange={e => handleSaveApiKey(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-900 text-white font-mono focus:outline-none focus:border-sky-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeyConfig(false)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-500 cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Paste official event URL (e.g. https://2026.emnlp.org/)..."
                      value={aiExtractUrl}
                      onChange={e => setAiExtractUrl(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#0c1015] text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    />
                    <button
                      type="button"
                      onClick={handleAiAutoFill}
                      disabled={isAiExtracting || !aiExtractUrl.trim()}
                      className="px-3.5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                    >
                      {isAiExtracting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Extracting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Auto-Fill</span>
                        </>
                      )}
                    </button>
                  </div>

                  {aiFeedback && (
                    <div
                      className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                        aiFeedback.isError
                          ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                          : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      {aiFeedback.message}
                    </div>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Event Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMNLP 2026, ACM CCS 2026, IEEE VIS 2026"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#0c1015] text-white focus:outline-none focus:border-lime-400"
                  />
                </div>

                {/* Type + Tier/Format row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category *</label>
                    <select
                      value={type}
                      onChange={e => setType(e.target.value as OpportunityType)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#0c1015] text-white focus:outline-none focus:border-lime-400 cursor-pointer"
                    >
                      <option value="conference">🎓 Conference</option>
                      <option value="workshop">🔧 Workshop</option>
                      <option value="hackathon">⚡ Hackathon</option>
                      <option value="job">💼 Regular Job</option>
                      <option value="internship">📌 Internship</option>
                    </select>
                  </div>

                  {type === 'conference' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Conference Tier</label>
                      <select
                        value={conferenceTier}
                        onChange={e => setConferenceTier(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#0c1015] text-white focus:outline-none focus:border-lime-400 cursor-pointer"
                      >
                        <option value="Core A*">Core A* (Elite Flagship)</option>
                        <option value="Core A">Core A (Premier)</option>
                        <option value="Core B">Core B</option>
                        <option value="Core C">Core C</option>
                        <option value="Tier 1 Industry">Tier 1 Industry</option>
                        <option value="Industry / Non-Academic">Industry / Non-Academic</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Work Mode</label>
                      <select
                        value={format}
                        onChange={e => setFormat(e.target.value as OpportunityFormat)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#0c1015] text-white focus:outline-none focus:border-lime-400 cursor-pointer"
                      >
                        <option value="in-person">📍 In-Person</option>
                        <option value="hybrid">🔀 Hybrid</option>
                        <option value="online">🌐 Online</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Organizer + Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Organizer / Society *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ACM, IEEE, ACL, USENIX"
                      value={organizer}
                      onChange={e => setOrganizer(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#0c1015] text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Budapest, Hungary or Online"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#0c1015] text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {type === 'internship' ? 'Applications Open *' : 'Event Start Date *'}
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#0c1015] text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {type === 'internship' ? 'Application Deadline *' : 'Event End Date *'}
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#0c1015] text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>
                </div>

                {/* Submission Deadline (Conferences/Workshops) */}
                {(type === 'conference' || type === 'workshop') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Paper / CFP Submission Deadline (optional)</label>
                    <input
                      type="date"
                      value={submissionDeadline}
                      onChange={e => setSubmissionDeadline(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#0c1015] text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>
                )}

                {/* Source URL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Official Website / Source URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={sourceUrl}
                    onChange={e => setSourceUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#0c1015] text-white focus:outline-none focus:border-lime-400"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Summary / Scope *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Brief description of the conference tracks, topics, or eligibility..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#0c1015] text-white focus:outline-none focus:border-lime-400 resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-slate-950 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Submitting...' : 'Submit Listing'}</span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
