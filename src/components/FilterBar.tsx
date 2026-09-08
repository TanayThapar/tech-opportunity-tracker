import React from 'react';
import { OpportunityType, OpportunityFormat } from '@/types';
import { Search, Filter, Layers, Globe } from 'lucide-react';

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
    { id: 'all', label: 'All Categories' },
    { id: 'hackathon', label: 'Hackathons' },
    { id: 'conference', label: 'Conferences' },
    { id: 'workshop', label: 'Workshops' },
    { id: 'internship', label: 'Internships' },
  ];

  const formats: { id: OpportunityFormat | 'all'; label: string }[] = [
    { id: 'all', label: 'All Formats' },
    { id: 'online', label: 'Online' },
    { id: 'in-person', label: 'In-person' },
    { id: 'hybrid', label: 'Hybrid' },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-4">
      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {types.map(t => (
          <button
            key={t.id}
            onClick={() => onSelectType(t.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              selectedType === t.id
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Secondary Row: Search input + Conference Tiering filter + Format filter */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
        {/* Search bar */}
        <div className="sm:col-span-5 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by title, organizer, or keyword..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
          />
        </div>

        {/* Conference Tiering sub-tag filter */}
        <div className="sm:col-span-4 relative">
          <div className="flex items-center">
            <Layers className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 pointer-events-none" />
            <select
              value={selectedTier}
              onChange={e => onSelectTier(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 appearance-none cursor-pointer"
            >
              <option value="all">All Conference Tiers (CORE A*, A, B...)</option>
              {tierList.map(tier => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Format filter */}
        <div className="sm:col-span-3 relative">
          <Globe className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 pointer-events-none" />
          <select
            value={selectedFormat}
            onChange={e => onSelectFormat(e.target.value as OpportunityFormat | 'all')}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 appearance-none cursor-pointer"
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
