import React from 'react';
import { TechOpportunity } from '@/types';
import { TypeBadge, TierBadge, FormatBadge, ConfidenceBadge } from './Badge';
import { ExternalLink, Calendar, Building2, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

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
  const formatDateRange = (startStr: string, endStr: string, isInternship: boolean) => {
    try {
      const s = parseISO(startStr);
      const e = parseISO(endStr);
      if (isInternship) {
        return `Deadline: ${format(e, 'MMM d, yyyy')}`;
      }
      if (startStr === endStr) {
        return format(s, 'MMM d, yyyy');
      }
      return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`;
    } catch {
      return `${startStr} – ${endStr}`;
    }
  };

  const isLowConfidence = opportunity.discovery_confidence === 'low';

  return (
    <div
      className={`rounded-xl p-5 transition-all duration-200 border bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md flex flex-col justify-between ${
        isLowConfidence
          ? 'border-amber-300 dark:border-amber-800/70 bg-gradient-to-br from-amber-50/20 to-transparent'
          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <TypeBadge type={opportunity.type} />
          {opportunity.type === 'conference' && <TierBadge tier={opportunity.conference_tier} />}
          <ConfidenceBadge confidence={opportunity.discovery_confidence} />
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug mb-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <a
            href={opportunity.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 group"
          >
            <span>{opportunity.title}</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-500 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </a>
        </h3>

        {/* Metadata items */}
        <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{opportunity.organizer}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <span>{formatDateRange(opportunity.start_date, opportunity.end_date, opportunity.type === 'internship')}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <FormatBadge format={opportunity.format} location={opportunity.location} />
          </div>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 line-clamp-3 leading-relaxed mb-4">
          {opportunity.description}
        </p>

        {/* Confidence reasons alert if low */}
        {isLowConfidence && opportunity.confidence_reasons && opportunity.confidence_reasons.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-semibold mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Flagged for Review:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800 dark:text-amber-300">
              {opportunity.confidence_reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between mt-auto">
        <a
          href={opportunity.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 inline-flex items-center gap-1"
        >
          <span>View Source & Register</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        {showReviewActions && onUpdateConfidence && (
          <div className="flex items-center gap-2">
            {isLowConfidence ? (
              <button
                onClick={() => onUpdateConfidence(opportunity.id, 'high')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 transition-colors"
              >
                <CheckCircle className="w-3 h-3" />
                <span>Mark Verified</span>
              </button>
            ) : (
              <button
                onClick={() => onUpdateConfidence(opportunity.id, 'low')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-zinc-700 dark:text-zinc-300 hover:text-amber-800 transition-colors"
              >
                <span>Flag Review</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
