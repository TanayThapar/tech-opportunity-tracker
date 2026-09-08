'use client';

import React, { useState, useEffect } from 'react';
import { TechOpportunity, EventComment } from '@/types';
import { TypeBadge, TierBadge, FormatBadge, ConfidenceBadge, CATEGORY_COLORS } from './Badge';
import { getInteraction, toggleStar, toggleParticipating, addComment } from '@/lib/interactions';
import {
  ExternalLink,
  Calendar,
  Building2,
  MapPin,
  AlertTriangle,
  Star,
  CheckCircle2,
  MessageSquare,
  Send,
  UserCheck,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface OpportunityCardProps {
  opportunity: TechOpportunity;
  onUpdateConfidence?: (id: string, newConfidence: 'high' | 'low') => void;
  showReviewActions?: boolean;
}

export default function OpportunityCard({
  opportunity,
  onUpdateConfidence,
  showReviewActions = false,
}: OpportunityCardProps) {
  const [isStarred, setIsStarred] = useState(false);
  const [isParticipating, setIsParticipating] = useState(false);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');

  const syncInteractions = () => {
    const data = getInteraction(opportunity.id);
    setIsStarred(!!data.starred);
    setIsParticipating(!!data.participating);
    setComments(data.comments || []);
  };

  useEffect(() => {
    syncInteractions();
    window.addEventListener('techradar_interaction_change', syncInteractions);
    return () => {
      window.removeEventListener('techradar_interaction_change', syncInteractions);
    };
  }, [opportunity.id]);

  const handleToggleStar = () => {
    const nextVal = toggleStar(opportunity.id);
    setIsStarred(nextVal);
  };

  const handleToggleParticipating = () => {
    const nextVal = toggleParticipating(opportunity.id);
    setIsParticipating(nextVal);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const added = addComment(opportunity.id, commentAuthor, commentText);
    setComments(prev => [...prev, added]);
    setCommentText('');
  };

  const formatDateRange = (startStr: string, endStr: string, isInternship: boolean) => {
    try {
      const s = parseISO(startStr);
      const e = parseISO(endStr);
      if (isInternship) {
        return `DEADLINE: ${format(e, 'yyyy-MM-dd')}`;
      }
      if (startStr === endStr) {
        return format(s, 'yyyy-MM-dd');
      }
      return `${format(s, 'yyyy-MM-dd')} -> ${format(e, 'yyyy-MM-dd')}`;
    } catch {
      return `${startStr} -> ${endStr}`;
    }
  };

  const isLowConfidence = opportunity.discovery_confidence === 'low';
  const categoryConfig = CATEGORY_COLORS[opportunity.type] || CATEGORY_COLORS.hackathon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`rounded-lg p-4 font-mono transition-all duration-150 border bg-[#0b1015] flex flex-col justify-between relative group ${
        isParticipating
          ? 'border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50'
          : isStarred
          ? 'border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40'
          : isLowConfidence
          ? 'border-amber-500/40'
          : `${categoryConfig.border} hover:border-zinc-500`
      }`}
    >
      <div>
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 mb-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <TypeBadge type={opportunity.type} />
            {opportunity.type === 'conference' && <TierBadge tier={opportunity.conference_tier} />}
            <ConfidenceBadge confidence={opportunity.discovery_confidence} />
          </div>

          <div className="flex items-center gap-1.5">
            {/* Star toggle button */}
            <button
              onClick={handleToggleStar}
              className={`p-1.5 rounded transition-all flex items-center gap-1 text-xs ${
                isStarred
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60'
                  : 'text-zinc-500 hover:text-amber-400 hover:bg-zinc-800'
              }`}
              title={isStarred ? 'Starred item' : 'Star this opportunity'}
            >
              <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>

            {/* Participating toggle button */}
            <button
              onClick={handleToggleParticipating}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 text-[11px] uppercase tracking-wider font-semibold ${
                isParticipating
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/70 shadow-xs'
                  : 'text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 border border-transparent'
              }`}
              title={isParticipating ? 'You marked: Participating' : 'Mark as participating'}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isParticipating ? 'ATTENDING' : '+ ATTEND'}</span>
            </button>
          </div>
        </div>

        {/* Title as Hyperlink */}
        <h3 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight leading-snug mb-2 group-hover:text-emerald-400 transition-colors">
          <a
            href={opportunity.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:underline decoration-emerald-500 underline-offset-4"
          >
            <span>{opportunity.title}</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 flex-shrink-0" />
          </a>
        </h3>

        {/* Terminal Metadata Table */}
        <div className="space-y-1 text-xs text-zinc-400 font-mono mb-3 bg-zinc-950/60 p-2 rounded border border-zinc-800/60">
          <div className="flex items-center gap-2">
            <span className="text-zinc-600">ORG:</span>
            <span className="text-zinc-200 truncate">{opportunity.organizer}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-600">DATE:</span>
            <span className="text-emerald-300 font-medium">
              {formatDateRange(opportunity.start_date, opportunity.end_date, opportunity.type === 'internship')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-600">LOC:</span>
            <FormatBadge format={opportunity.format} location={opportunity.location} />
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-400 leading-relaxed mb-3 line-clamp-3 font-mono">
          &gt; {opportunity.description}
        </p>

        {/* Diagnostic flags for review */}
        {isLowConfidence && opportunity.confidence_reasons && opportunity.confidence_reasons.length > 0 && (
          <div className="mb-3 p-2.5 rounded bg-amber-950/30 border border-amber-500/40 text-[11px] text-amber-200">
            <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>AUDIT_NOTICE:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-300/90 font-mono">
              {opportunity.confidence_reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer & Interactions */}
      <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between mt-auto text-xs">
        <div className="flex items-center gap-3">
          <a
            href={opportunity.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
          >
            <span>[SOURCE_LINK]</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Comments count trigger */}
          <button
            onClick={() => setShowCommentsDrawer(!showCommentsDrawer)}
            className="flex items-center gap-1 text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{comments.length} notes</span>
          </button>
        </div>

        {showReviewActions && onUpdateConfidence && (
          <div>
            {isLowConfidence ? (
              <button
                onClick={() => onUpdateConfidence(opportunity.id, 'high')}
                className="px-2 py-1 text-[11px] font-bold rounded bg-emerald-950/70 border border-emerald-500/80 text-emerald-300 hover:bg-emerald-900/80 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>APPROVE</span>
              </button>
            ) : (
              <button
                onClick={() => onUpdateConfidence(opportunity.id, 'low')}
                className="px-2 py-1 text-[11px] font-semibold rounded bg-zinc-800 hover:bg-amber-950/60 border border-zinc-700 hover:border-amber-500/50 text-zinc-400 hover:text-amber-300"
              >
                <span>FLAG</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Interactive Terminal Comments & Notes Drawer */}
      <AnimatePresence>
        {showCommentsDrawer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2 overflow-hidden"
          >
            <div className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>// COMMUNITY_NOTES & PARTICIPANT_COMMENTS</span>
              <span className="text-zinc-600">{comments.length} entries</span>
            </div>

            {/* List of comments */}
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {comments.length === 0 ? (
                <div className="text-[11px] text-zinc-600 italic py-1">
                  No notes logged yet. Be the first to comment or share team plans!
                </div>
              ) : (
                comments.map(c => (
                  <div
                    key={c.id}
                    className="p-2 rounded bg-zinc-950 border border-zinc-800/60 text-[11px] text-zinc-300"
                  >
                    <div className="flex items-center justify-between text-zinc-500 text-[10px] mb-0.5">
                      <span className="text-cyan-400 font-semibold">@{c.author}</span>
                      <span>{format(parseISO(c.timestamp), 'MMM d, HH:mm')}</span>
                    </div>
                    <p className="text-zinc-300 font-mono break-words">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add comment form */}
            <form onSubmit={handleAddComment} className="space-y-1.5 pt-1">
              <input
                type="text"
                placeholder="Your handle (e.g. alice, team-alpha)"
                value={commentAuthor}
                onChange={e => setCommentAuthor(e.target.value)}
                className="w-full px-2.5 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded focus:outline-none focus:border-emerald-500 text-zinc-200 placeholder-zinc-600 font-mono"
              />
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Add note, finding teammates, or advice..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded focus:outline-none focus:border-emerald-500 text-zinc-200 placeholder-zinc-600 font-mono"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded flex items-center gap-1 transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>POST</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
