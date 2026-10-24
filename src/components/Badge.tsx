import React from 'react';
import { OpportunityType, OpportunityFormat, DiscoveryConfidence } from '@/types';
import { Sparkles, Calendar, Briefcase, GraduationCap, Code2, Globe, Laptop, Building2 } from 'lucide-react';

export const CATEGORY_COLORS: Record<OpportunityType, {
  border: string;
  bg: string;
  text: string;
  pillClass: string;
  label: string;
}> = {
  conference: {
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-950/40',
    text: 'text-cyan-300',
    pillClass: 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/40',
    label: 'Conference',
  },
  job: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    pillClass: 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40',
    label: 'Job',
  },
  internship: {
    border: 'border-amber-400/30',
    bg: 'bg-amber-950/30',
    text: 'text-amber-200',
    pillClass: 'bg-amber-950/30 border-amber-400/30 text-amber-200 hover:bg-amber-900/30',
    label: 'Internship',
  },
  hackathon: {
    border: 'border-lime-500/40',
    bg: 'bg-lime-950/40',
    text: 'text-lime-300',
    pillClass: 'bg-lime-950/40 border-lime-500/40 text-lime-300 hover:bg-lime-900/40',
    label: 'Hackathon',
  },
  workshop: {
    border: 'border-purple-500/40',
    bg: 'bg-purple-950/40',
    text: 'text-purple-300',
    pillClass: 'bg-purple-500/10 border-purple-500/40 text-purple-300 hover:bg-purple-900/40',
    label: 'Workshop',
  },
};

export function TypeBadge({ type }: { type: OpportunityType }) {
  const config = CATEGORY_COLORS[type] || CATEGORY_COLORS.hackathon;

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md border uppercase tracking-wider font-semibold ${config.bg} ${config.text} ${config.border}`}
    >
      {config.label}
    </span>
  );
}

export function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier) return null;

  let colorClasses = 'border-slate-700 bg-slate-900 text-slate-300';

  if (tier.includes('A*') || tier.includes('Core A*')) {
    colorClasses = 'border-rose-500/50 bg-rose-950/40 text-rose-300 font-bold';
  } else if (tier.includes('Core A') || tier === 'A') {
    colorClasses = 'border-orange-500/50 bg-orange-950/40 text-orange-300 font-semibold';
  } else if (tier.includes('Core B') || tier === 'B') {
    colorClasses = 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300';
  } else if (tier.includes('Core C') || tier === 'C') {
    colorClasses = 'border-slate-700 bg-slate-800 text-slate-400';
  }

  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md border ${colorClasses}`}>
      ★ {tier}
    </span>
  );
}

export function FormatBadge({ format, location }: { format: OpportunityFormat; location?: string | null }) {
  const isOnline = format === 'online';
  const isHybrid = format === 'hybrid';

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 font-mono text-[10px] uppercase font-semibold text-slate-300">
        {isOnline && <Globe className="w-3 h-3 text-cyan-400" />}
        {isHybrid && <Laptop className="w-3 h-3 text-purple-400" />}
        {!isOnline && !isHybrid && <Building2 className="w-3 h-3 text-amber-400" />}
        <span>{format}</span>
      </span>
      {location && <span className="text-slate-400 truncate max-w-[200px]">{location}</span>}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: DiscoveryConfidence }) {
  if (confidence === 'low') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-amber-950/40 text-amber-300 border border-amber-500/40">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Needs Review
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-lime-950/40 text-lime-300 border border-lime-500/40">
      <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
      Verified Liveness
    </span>
  );
}
