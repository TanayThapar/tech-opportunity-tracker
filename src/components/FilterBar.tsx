import React from 'react';
import { OpportunityType, OpportunityFormat } from '@/types';
import { Search, Layers, Globe, Terminal } from 'lucide-react';
import { CATEGORY_COLORS } from './Badge';

interface FilterBarProps {
  selectedType: OpportunityType | 'all';
  onSelectType: (type: OpportunityType | 'all') => void;
  selectedTier: string | 'all';
  onSelectTier: (tier: string | 'all') => void;
  selectedFormat: OpportunityFormat | 'all';
  onSelectFormat: (format: OpportunityFormat | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  tierList: string[];
}

export default function FilterBar({
  selectedType,
  onSelectType,
  selectedTier,
  onSelectTier,
  selectedFormat,
  onSelectFormat,
  searchQuery,
  onSearchChange,
  tierList,
}: FilterBarProps) {
  const types: { id: OpportunityType | 'all'; label: string }[] = [
    { id: 'all', label: '[ALL CATEGORIES]' },
    { id: 'hackathon', label: '[HACKATHONS]' },
    { id: 'conference', label: '[CONFERENCES]' },
    { id: 'workshop', label: '[WORKSHOPS]' },
    { id: 'internship', label: '[INTERNSHIPS]' },
  ];

  const formats: { id: OpportunityFormat | 'all'; label: string }[] = [
    { id: 'all', label: 'All Formats' },
    { id: 'online', label: 'Online Only' },
    { id: 'in-person', label: 'In-person Only' },
    { id: 'hybrid', label: 'Hybrid' },
  ];

  return (
    <div className="bg-[#0b1016] border border-zinc-800 rounded-xl p-4 font-mono shadow-lg space-y-3">
      {/* Category Pills with explicit colors */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {types.map(t => {
          const isSelected = selectedType === t.id;
          let activeClass = 'bg-zinc-800 text-zinc-300 border-zinc-700';

          if (isSelected) {
            if (t.id === 'hackathon') activeClass = 'bg-purple-950 border-purple-500 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.3)]';
            else if (t.id === 'conference') activeClass = 'bg-cyan-950 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.3)]';
            else if (t.id === 'workshop') activeClass = 'bg-emerald-950 border-emerald-500 text-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.3)]';
            else if (t.id === 'internship') activeClass = 'bg-amber-950 border-amber-500 text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.3)]';
            else activeClass = 'bg-emerald-600 text-black font-extrabold border-emerald-400';
          }

          return (
            <button
              key={t.id}
              onClick={() => onSelectType(t.id)}
              className={`px-3 py-1.5 rounded text-xs font-mono border transition-all whitespace-nowrap ${
                isSelected ? activeClass : 'bg-[#080d12] text-zinc-500 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Query, Tier, & Format Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-zinc-800/80">
        {/* Search */}
        <div className="sm:col-span-5 relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="grep -i 'title|organizer' ..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#080c10] border border-zinc-800 rounded focus:outline-none focus:border-emerald-500 text-emerald-300 placeholder-zinc-600 font-mono"
          />
        </div>

        {/* Conference Tiering */}
        <div className="sm:col-span-4 relative">
          <Layers className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <select
            value={selectedTier}
            onChange={e => onSelectTier(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#080c10] border border-zinc-800 rounded focus:outline-none focus:border-emerald-500 text-zinc-300 appearance-none cursor-pointer font-mono"
          >
            <option value="all">-- Tier: All (Core A*, A, B, C) --</option>
            {tierList.map(tier => (
              <option key={tier} value={tier}>
                Rank: {tier}
              </option>
            ))}
          </select>
        </div>

        {/* Format */}
        <div className="sm:col-span-3 relative">
          <Globe className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <select
            value={selectedFormat}
            onChange={e => onSelectFormat(e.target.value as OpportunityFormat | 'all')}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#080c10] border border-zinc-800 rounded focus:outline-none focus:border-emerald-500 text-zinc-300 appearance-none cursor-pointer font-mono"
          >
            {formats.map(f => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
