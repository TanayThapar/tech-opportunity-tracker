import React from 'react';
import { OpportunityType, OpportunityFormat, DiscoveryConfidence } from '@/types';

export function TypeBadge({ type }: { type: OpportunityType }) {
  const styles: Record<OpportunityType, string> = {
    hackathon: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    conference: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    workshop: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    internship: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  };

  const labels: Record<OpportunityType, string> = {
    hackathon: 'Hackathon',
    conference: 'Conference',
    workshop: 'Workshop',
    internship: 'Internship',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}

export function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier) return null;

  let colorClasses = 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700';

  if (tier.includes('A*') || tier.includes('Core A*')) {
    colorClasses = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold';
  } else if (tier.includes('Core A') || tier === 'A') {
    colorClasses = 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-800 font-semibold';
  } else if (tier.includes('Core B') || tier === 'B') {
    colorClasses = 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-800';
  } else if (tier.includes('Core C') || tier === 'C') {
    colorClasses = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${colorClasses}`}>
      ★ {tier}
    </span>
  );
}

export function FormatBadge({ format, location }: { format: OpportunityFormat; location?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
      <span className="capitalize font-medium">{format}</span>
      {location && <span className="text-zinc-400 dark:text-zinc-500 truncate max-w-[160px]">• {location}</span>}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: DiscoveryConfidence }) {
  if (confidence === 'low') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Needs Review (Low Confidence)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Verified High Confidence
    </span>
  );
}
