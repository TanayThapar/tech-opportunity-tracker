'use client';

import React, { useState } from 'react';
import { DeadlineCollisionCluster } from '@/types';
import { AlertTriangle, Flame, ChevronDown, ChevronUp, Calendar, Zap } from 'lucide-react';

interface CollisionRadarBannerProps {
  clusters: DeadlineCollisionCluster[];
  onSelectCluster?: (cluster: DeadlineCollisionCluster) => void;
}

export default function CollisionRadarBanner({
  clusters,
  onSelectCluster,
}: CollisionRadarBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!clusters || clusters.length === 0) return null;

  const topCluster = clusters[0];
  const isCritical = topCluster.severity === 'critical';
  const isMedium = topCluster.severity === 'medium';

  const bannerBorder = isCritical
    ? 'border-rose-500/60 bg-rose-950/20'
    : isMedium
    ? 'border-amber-500/60 bg-amber-950/20'
    : 'border-yellow-500/40 bg-yellow-950/15';

  const badgeStyle = isCritical
    ? 'bg-rose-950 text-rose-300 border-rose-500/50'
    : isMedium
    ? 'bg-amber-950 text-amber-300 border-amber-500/50'
    : 'bg-yellow-950 text-yellow-300 border-yellow-500/40';

  return (
    <div className={`rounded-xl border p-4 font-sans transition-all shadow-sm ${bannerBorder}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-black/40 shrink-0 mt-0.5">
            {isCritical ? (
              <Flame className="w-5 h-5 text-rose-400 animate-pulse" />
            ) : (
              <Zap className="w-5 h-5 text-amber-400" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${badgeStyle}`}>
                {isCritical ? 'CRITICAL CRUNCH' : isMedium ? 'CONGESTION WARNING' : 'COLLISION RADAR'}
              </span>
              <h3 className="font-bold text-sm text-white">{topCluster.title}</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {topCluster.message}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Colliding Submission Deadlines ({topCluster.opportunities.length} events):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {topCluster.opportunities.map(opp => {
              const ddl = opp.submission_deadline || opp.application_deadline || opp.start_date;
              return (
                <div
                  key={opp.id}
                  className="p-2.5 rounded-lg bg-[#0c1015] border border-slate-800 text-xs flex flex-col justify-between space-y-1"
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                    <span className="text-amber-400 font-bold">{ddl?.slice(0, 10)}</span>
                    <span className="text-slate-500 uppercase">{opp.type}</span>
                  </div>
                  <p className="font-semibold text-white truncate text-xs" title={opp.title}>
                    {opp.title}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{opp.organizer}</p>
                </div>
              );
            })}
          </div>

          {clusters.length > 1 && (
            <p className="text-[11px] text-slate-400 italic pt-1">
              +{clusters.length - 1} additional deadline collision window(s) detected across upcoming months.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
