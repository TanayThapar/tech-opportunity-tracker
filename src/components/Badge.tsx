import React from 'react';
import { OpportunityType, OpportunityFormat, DiscoveryConfidence } from '@/types';

export const CATEGORY_COLORS: Record<OpportunityType, {
  border: string;
  bg: string;
  text: string;
  glow: string;
  pillClass: string;
  label: string;
}> = {
  hackathon: {
    border: 'border-purple-500/50',
    bg: 'bg-purple-950/40',
    text: 'text-purple-300',
    glow: 'shadow-purple-500/20',
    pillClass: 'bg-purple-500/10 border-purple-500/50 text-purple-300 hover:bg-purple-500/20',
    label: '[hackathon]',
  },
  conference: {
    border: 'border-cyan-500/50',
    bg: 'bg-cyan-950/40',
    text: 'text-cyan-300',
    glow: 'shadow-cyan-500/20',
    pillClass: 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/20',
    label: '[conference]',
  },
  workshop: {
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    glow: 'shadow-emerald-500/20',
    pillClass: 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/20',
    label: '[workshop]',
  },
  internship: {
    border: 'border-amber-500/50',
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    glow: 'shadow-amber-500/20',
    pillClass: 'bg-amber-500/10 border-amber-500/50 text-amber-300 hover:bg-amber-500/20',
    label: '[internship]',
  },
};

export function TypeBadge({ type }: { type: OpportunityType }) {
  const config = CATEGORY_COLORS[type] || CATEGORY_COLORS.hackathon;

  return (
    <span className={`inline-flex items-center font-mono text-[11px] px-2 py-0.5 rounded border uppercase tracking-wider font-semibold ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
}

export function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier) return null;

  let colorClasses = 'border-zinc-700 bg-zinc-900 text-zinc-300';

  if (tier.includes('A*') || tier.includes('Core A*')) {
    colorClasses = 'border-rose-500/60 bg-rose-950/40 text-rose-300 font-bold';
  } else if (tier.includes('Core A') || tier === 'A') {
    colorClasses = 'border-orange-500/60 bg-orange-950/40 text-orange-300 font-semibold';
  } else if (tier.includes('Core B') || tier === 'B') {
    colorClasses = 'border-blue-500/60 bg-blue-950/40 text-blue-300';
  } else if (tier.includes('Core C') || tier === 'C') {
    colorClasses = 'border-zinc-700 bg-zinc-800/80 text-zinc-400';
  }

  return (
    <span className={`inline-flex items-center font-mono text-[11px] px-2 py-0.5 rounded border ${colorClasses}`}>
      ★ {tier}
    </span>
  );
}

export function FormatBadge({ format, location }: { format: OpportunityFormat; location?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-400">
      <span className="text-zinc-300 font-medium">[{format}]</span>
      {location && <span className="text-zinc-500 truncate max-w-[180px]">@ {location}</span>}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: DiscoveryConfidence }) {
  if (confidence === 'low') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-amber-950/50 text-amber-300 border border-amber-500/60">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        FLAG_REVIEW
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-500/50">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      CONFIRMED
    </span>
  );
}
