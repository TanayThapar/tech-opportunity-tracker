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
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface OpportunityCardProps {
  opportunity: TechOpportunity;
  onUpdateConfidence?: (id: string, newConfidence: 'high' | 'low') => void;
  showReviewActions?: boolean;
  onApprove?: (id: string) => void;
}

export default function OpportunityCard({
  opportunity,
  onUpdateConfidence,
  showReviewActions = false,
  onApprove,
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

  const formatDateRange = () => {
    if (opportunity.type === 'job') {
      if (opportunity.application_deadline) {
        try {
          return `DEADLINE: ${format(parseISO(opportunity.application_deadline), 'yyyy-MM-dd')}`;
        } catch {
          return `DEADLINE: ${opportunity.application_deadline}`;
        }
      }
      return 'NO DEADLINE LISTED (ROLLING)';
    }

    try {
      const s = parseISO(opportunity.start_date);
      const e = parseISO(opportunity.end_date);
      if (opportunity.type === 'internship') {
        return `DEADLINE: ${format(e, 'yyyy-MM-dd')}`;
      }
      if (opportunity.start_date === opportunity.end_date) {
        return format(s, 'yyyy-MM-dd');
      }
      return `${format(s, 'yyyy-MM-dd')} -> ${format(e, 'yyyy-MM-dd')}`;
    } catch {
      return `${opportunity.start_date} -> ${opportunity.end_date}`;
    }
  };

  const isLowConfidence = opportunity.discovery_confidence === 'low';
  const categoryConfig = CATEGORY_COLORS[opportunity.type] || CATEGORY_COLORS.hackathon;
  const isStaleOrUnreachable =
    opportunity.link_status === 'unreachable' || opportunity.listing_status === 'stale';

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
            {opportunity.approved_by && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                <ShieldCheck className="w-3 h-3" />
                Approved
              </span>
            )}
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
              <span className="hidden sm:inline">{isParticipating ? 'ATTENDING' : 'ATTEND'}</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-base text-zinc-100 group-hover:text-emerald-400 transition-colors leading-snug">
          {opportunity.title}
        </h3>

        {/* Organizer / Company */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-2 font-medium">
          <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="truncate">{opportunity.company || opportunity.organizer}</span>
        </div>

        {/* Date / Submission Deadline */}
        <div className="flex flex-col gap-1 mt-2 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{formatDateRange()}</span>
          </div>

          {opportunity.submission_deadline && opportunity.type === 'conference' && (
            <div className="text-[11px] text-amber-400 flex items-center gap-1 pl-5">
              <span>Paper / CFP Deadline:</span>
              <span className="font-bold">{opportunity.submission_deadline.slice(0, 10)}</span>
              <span className="text-[10px] text-zinc-500">(UTC)</span>
            </div>
          )}
        </div>

        {/* Format / Location */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-2">
          <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <FormatBadge format={opportunity.work_mode || opportunity.format} location={opportunity.location} />
        </div>

        {/* Stale or Unreachable Warning Badge for Jobs */}
        {isStaleOrUnreachable && (
          <div className="mt-2.5 p-1.5 bg-amber-950/40 border border-amber-500/50 rounded text-[11px] text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>May no longer be open, confirm on the employer site</span>
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-zinc-400 mt-3 line-clamp-3 leading-relaxed">
          {opportunity.description}
        </p>

        {/* Job Timestamp Note */}
        {opportunity.type === 'job' && (
          <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-zinc-600" />
            <span>Listing as of {opportunity.last_checked_at?.slice(0, 10) || opportunity.posted_date || 'fetch time'}, confirm on the employer site</span>
          </div>
        )}

        {/* Provenance note */}
        {opportunity.approval_basis && (
          <div className="mt-2 text-[10px] text-zinc-500 italic">
            Approval note: {opportunity.approval_basis} ({opportunity.approved_by})
          </div>
        )}

        {/* Diagnostic Confidence Reasons (if low or on review page) */}
        {opportunity.confidence_reasons && opportunity.confidence_reasons.length > 0 && (
          <div className="mt-3 p-2 bg-zinc-950/80 rounded border border-zinc-800/80 text-[11px] space-y-1">
            <span className="text-zinc-500 font-bold uppercase tracking-wider block text-[10px]">
              AUDIT_REASONS:
            </span>
            {opportunity.confidence_reasons.map((reason, idx) => (
              <div key={idx} className="text-zinc-400 flex items-start gap-1">
                <span className="text-zinc-600">•</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
        <a
          href={opportunity.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
        >
          <span>Official Portal</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        <div className="flex items-center gap-2">
          {/* Comments drawer toggle */}
          <button
            onClick={() => setShowCommentsDrawer(!showCommentsDrawer)}
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors py-1 px-1.5 rounded hover:bg-zinc-800"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{comments.length}</span>
          </button>

          {/* Review actions if shown */}
          {showReviewActions && onApprove && (
            <button
              onClick={() => onApprove(opportunity.id)}
              className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 font-bold text-xs rounded transition-colors flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve & Publish</span>
            </button>
          )}
        </div>
      </div>

      {/* Slide-out comments section */}
      <AnimatePresence>
        {showCommentsDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-zinc-800/90 text-xs overflow-hidden"
          >
            <span className="text-zinc-500 font-bold uppercase tracking-wider block text-[10px] mb-2">
              COMMUNITY_COMMENTS:
            </span>

            <div className="space-y-2 max-h-36 overflow-y-auto mb-2 pr-1">
              {comments.length === 0 ? (
                <p className="text-zinc-600 italic text-[11px]">// No discussion yet. Be the first to comment.</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="p-1.5 bg-[#080d11] rounded border border-zinc-800/60 text-[11px]">
                    <div className="flex items-center justify-between text-zinc-500 text-[10px] mb-0.5">
                      <span className="font-bold text-zinc-400">{c.author}</span>
                      <span>{c.timestamp.slice(0, 10)}</span>
                    </div>
                    <p className="text-zinc-300">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-1.5 mt-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                className="flex-1 bg-[#080d11] border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="submit"
                className="p-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 rounded transition-colors"
                title="Send comment"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
