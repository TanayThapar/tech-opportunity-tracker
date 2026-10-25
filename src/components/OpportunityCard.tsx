'use client';

import React, { useState, useEffect } from 'react';
import { TechOpportunity, EventComment } from '@/types';
import { TypeBadge, TierBadge, FormatBadge, ConfidenceBadge, SocietyBadge, CATEGORY_COLORS } from './Badge';
import { detectSocieties } from '@/lib/societyUtils';
import { extractSkills, calculateSkillMatch } from '@/lib/skillMatcher';
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
  Bookmark,
  Sparkles,
  Zap,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface OpportunityCardProps {
  opportunity: TechOpportunity;
  onUpdateConfidence?: (id: string, newConfidence: 'high' | 'low') => void;
  showReviewActions?: boolean;
  onApprove?: (id: string) => void;
  userSkills?: string[];
  isCollision?: boolean;
  collisionSeverity?: 'low' | 'medium' | 'critical';
}

export default function OpportunityCard({
  opportunity,
  onUpdateConfidence,
  showReviewActions = false,
  onApprove,
  userSkills = [],
  isCollision = false,
  collisionSeverity = 'low',
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
          return `Deadline: ${format(parseISO(opportunity.application_deadline), 'yyyy-MM-dd')}`;
        } catch {
          return `Deadline: ${opportunity.application_deadline}`;
        }
      }
      return 'Rolling Admissions / No Stated Deadline';
    }

    try {
      const s = parseISO(opportunity.start_date);
      const e = parseISO(opportunity.end_date);
      if (opportunity.type === 'internship') {
        return `Apply by: ${format(e, 'yyyy-MM-dd')}`;
      }
      if (opportunity.start_date === opportunity.end_date) {
        return format(s, 'yyyy-MM-dd');
      }
      return `${format(s, 'yyyy-MM-dd')} → ${format(e, 'yyyy-MM-dd')}`;
    } catch {
      return `${opportunity.start_date} → ${opportunity.end_date}`;
    }
  };

  const isLowConfidence = opportunity.discovery_confidence === 'low';
  const categoryConfig = CATEGORY_COLORS[opportunity.type] || CATEGORY_COLORS.hackathon;
  const isStaleOrUnreachable =
    opportunity.link_status === 'unreachable' || opportunity.listing_status === 'stale';

  const skills = opportunity.skills && opportunity.skills.length > 0
    ? opportunity.skills
    : extractSkills(opportunity);
  const match = calculateSkillMatch(skills, userSkills);

  return (
    <div
      className={`rounded-xl p-5 font-sans transition-all duration-200 border bg-[#111620] flex flex-col justify-between relative group shadow-sm hover:shadow-md ${
        isParticipating
          ? 'border-lime-500/80 ring-1 ring-lime-500/40'
          : isStarred
          ? 'border-amber-500/80 ring-1 ring-amber-500/30'
          : match.percentage >= 60
          ? 'border-lime-400/70 ring-1 ring-lime-400/30'
          : isLowConfidence
          ? 'border-amber-500/30'
          : `${categoryConfig.border} hover:border-slate-600`
      }`}
    >
      <div>
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <TypeBadge type={opportunity.type} />
            {opportunity.type === 'conference' && <TierBadge tier={opportunity.conference_tier} />}
            {detectSocieties(opportunity).map(soc => (
              <SocietyBadge key={soc} society={soc} />
            ))}
            {opportunity.subfield && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                {opportunity.subfield}
              </span>
            )}
            {match.percentage > 0 && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-lime-950/90 text-lime-300 border border-lime-400/60 shadow-sm"
                title={`${match.matchCount} skill(s) match your tech stack`}
              >
                <Sparkles className="w-2.5 h-2.5 text-lime-400" />
                {match.percentage}% Match
              </span>
            )}
            {isCollision && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border shadow-sm ${
                  collisionSeverity === 'critical'
                    ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                    : 'bg-amber-950 text-amber-300 border-amber-500/50'
                }`}
                title="Deadline collides with other submissions this week"
              >
                <Zap className="w-2.5 h-2.5" />
                Crunch Alert
              </span>
            )}
            <ConfidenceBadge confidence={opportunity.discovery_confidence} />
            {opportunity.approved_by && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-lime-950/60 text-lime-300 border border-lime-500/40">
                <ShieldCheck className="w-3 h-3 text-lime-400" />
                Moderated
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Star / Save toggle */}
            <button
              onClick={handleToggleStar}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
                isStarred
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/60'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
              }`}
              title={isStarred ? 'Saved to personal watchlist' : 'Save to watchlist'}
              aria-label={isStarred ? 'Saved' : 'Save'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span className="hidden sm:inline font-medium text-[11px]">{isStarred ? 'Saved' : 'Save'}</span>
            </button>

            {/* Participating toggle button */}
            <button
              onClick={handleToggleParticipating}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] uppercase tracking-wider font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-lime-400/50 ${
                isParticipating
                  ? 'bg-lime-400/20 text-lime-300 border border-lime-500/60'
                  : 'text-slate-400 hover:text-lime-400 hover:bg-slate-800 border border-transparent'
              }`}
              title={isParticipating ? 'Marked as attending / participating' : 'Mark as attending'}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isParticipating ? 'ATTENDING' : 'ATTEND'}</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-base text-white group-hover:text-lime-300 transition-colors leading-snug">
          {opportunity.title}
        </h3>

        {/* Organizer / Company */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2 font-medium">
          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{opportunity.company || opportunity.organizer}</span>
        </div>

        {/* Date / Submission Deadline */}
        <div className="flex flex-col gap-1 mt-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-lime-400 shrink-0" />
            <span className="font-mono font-semibold">{formatDateRange()}</span>
          </div>

          {opportunity.submission_deadline && (
            <div className="text-[11px] text-amber-400 flex items-center gap-1.5 pl-5 font-mono">
              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
              <span>CFP / Paper Deadline:</span>
              <span className="font-bold text-white">{opportunity.submission_deadline.slice(0, 10)}</span>
              <span className="text-[10px] text-slate-500">(UTC)</span>
            </div>
          )}
        </div>

        {/* Format / Location */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <FormatBadge format={opportunity.work_mode || opportunity.format} location={opportunity.location} />
        </div>

        {/* Stale / Unreachable Warning Badge for Jobs */}
        {isStaleOrUnreachable && (
          <div className="mt-2.5 p-2 bg-amber-950/40 border border-amber-500/40 rounded-lg text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>May no longer be open. Requisition status unconfirmed, please verify on employer site.</span>
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-slate-300 mt-3 line-clamp-3 leading-relaxed">
          {opportunity.description}
        </p>

        {/* Tech Stack Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-2.5">
            {skills.map(s => {
              const isMatched = match.matchingSkills.some(m => m.toLowerCase() === s.toLowerCase());
              return (
                <span
                  key={s}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    isMatched
                      ? 'bg-lime-950/80 text-lime-300 border border-lime-400/60 font-bold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {s}
                </span>
              );
            })}
          </div>
        )}

        {/* Job Requisition Provenance Note */}
        {opportunity.type === 'job' && (
          <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500 shrink-0" />
            <span>
              Checked as of {opportunity.last_checked_at?.slice(0, 10) || opportunity.posted_date || 'runtime'}. Direct requisition link.
            </span>
          </div>
        )}

        {/* Audit Reasons / Provenance */}
        {opportunity.confidence_reasons && opportunity.confidence_reasons.length > 0 && (
          <div className="mt-3 p-2.5 bg-[#0c1015] rounded-lg border border-slate-800 text-[11px] space-y-1">
            <span className="text-slate-400 font-mono font-bold uppercase tracking-wider block text-[10px]">
              Provenance & Verification:
            </span>
            {opportunity.confidence_reasons.map((reason, idx) => (
              <div key={idx} className="text-slate-300 flex items-start gap-1.5 font-mono text-[10px]">
                <span className="text-slate-500">•</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
        <a
          href={opportunity.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-lime-400 hover:text-lime-300 font-semibold transition-colors focus:outline-none focus:underline"
        >
          <span>{opportunity.type === 'job' ? 'View Requisition' : 'Official Portal'}</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        <div className="flex items-center gap-2">
          {/* Comments drawer toggle */}
          <button
            onClick={() => setShowCommentsDrawer(!showCommentsDrawer)}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors py-1 px-2 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="font-mono text-xs">{comments.length}</span>
          </button>

          {/* Review actions if shown */}
          {showReviewActions && onApprove && (
            <button
              onClick={() => onApprove(opportunity.id)}
              className="px-2.5 py-1 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve</span>
            </button>
          )}
        </div>
      </div>

      {/* Comments section */}
      {showCommentsDrawer && (
        <div className="mt-3 pt-3 border-t border-slate-800 text-xs">
          <span className="text-slate-400 font-mono font-bold uppercase tracking-wider block text-[10px] mb-2">
            Community Notes:
          </span>

          <div className="space-y-2 max-h-36 overflow-y-auto mb-2 pr-1">
            {comments.length === 0 ? (
              <p className="text-slate-500 italic text-[11px]">No notes yet. Add thoughts or deadlines below.</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="p-2 bg-[#0c1015] rounded-lg border border-slate-800 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-0.5">
                    <span className="font-bold text-white">{c.author}</span>
                    <span className="font-mono">{c.timestamp.slice(0, 10)}</span>
                  </div>
                  <p className="text-slate-200">{c.text}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-1.5 mt-2">
            <input
              type="text"
              placeholder="Add your note..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              className="flex-1 bg-[#0c1015] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-lime-400"
            />
            <button
              type="submit"
              className="p-1.5 bg-lime-400 hover:bg-lime-300 text-slate-950 rounded-lg transition-colors cursor-pointer"
              title="Add note"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
