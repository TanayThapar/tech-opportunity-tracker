import React from 'react';
import { OpportunityType, OpportunityFormat } from '@/types';
import { Search, Layers, Globe, Building2, X } from 'lucide-react';

interface FilterBarProps {
  selectedType: OpportunityType | 'all';
  onSelectType: (type: OpportunityType | 'all') => void;
  selectedTier: string | 'all';
  onSelectTier: (tier: string | 'all') => void;
  selectedFormat: OpportunityFormat | 'all';
  onSelectFormat: (format: OpportunityFormat | 'all') => void;
  selectedCompany?: string | 'all';
  onSelectCompany?: (company: string | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  tierList: string[];
  companyList?: string[];
}

export default function FilterBar({
  selectedType,
  onSelectType,
  selectedTier,
  onSelectTier,
  selectedFormat,
  onSelectFormat,
  selectedCompany = 'all',
  onSelectCompany,
  searchQuery,
  onSearchChange,
  tierList,
  companyList = [],
}: FilterBarProps) {
  const types: { id: OpportunityType | 'all'; label: string }[] = [
    { id: 'all', label: 'All Categories' },
    { id: 'conference', label: 'Conferences' },
    { id: 'job', label: 'Jobs' },
    { id: 'hackathon', label: 'Hackathons' },
    { id: 'internship', label: 'Internships' },
    { id: 'workshop', label: 'Workshops' },
  ];

  const formats: { id: OpportunityFormat | 'all'; label: string }[] = [
    { id: 'all', label: 'All Modes' },
    { id: 'in-person', label: 'In-person' },
    { id: 'hybrid', label: 'Hybrid' },
    { id: 'online', label: 'Online' },
  ];

  return (
    <div className="bg-[#111620] border border-slate-800 rounded-xl p-4 font-sans shadow-sm space-y-3.5">
      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {types.map(t => {
          const isSelected = selectedType === t.id;
          let activeClass = 'bg-slate-800 text-white border-slate-600';

          if (isSelected) {
            if (t.id === 'conference') activeClass = 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-sm';
            else if (t.id === 'job') activeClass = 'bg-amber-950 border-amber-400 text-amber-300 shadow-sm';
            else if (t.id === 'hackathon') activeClass = 'bg-lime-950 border-lime-400 text-lime-300 shadow-sm';
            else if (t.id === 'workshop') activeClass = 'bg-purple-950 border-purple-400 text-purple-300 shadow-sm';
            else if (t.id === 'internship') activeClass = 'bg-amber-950/70 border-amber-300 text-amber-200 shadow-sm';
            else activeClass = 'bg-lime-400 text-slate-950 font-bold border-lime-400 shadow-sm';
          }

          return (
            <button
              key={t.id}
              onClick={() => onSelectType(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? activeClass
                  : 'bg-[#0c1015] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Query, Tier, Company & Format Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-800/80">
        {/* Search */}
        <div className="sm:col-span-5 relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search opportunities, organizers, locations..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-[#0c1015] border border-slate-700 rounded-lg focus:outline-none focus:border-lime-400 text-white placeholder-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Work Mode */}
        <div className="sm:col-span-3 relative">
          <Globe className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <select
            value={selectedFormat}
            onChange={e => onSelectFormat(e.target.value as OpportunityFormat | 'all')}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#0c1015] border border-slate-700 rounded-lg focus:outline-none focus:border-lime-400 text-slate-200 cursor-pointer"
          >
            {formats.map(f => (
              <option key={f.id} value={f.id} className="bg-[#111620]">
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Conference Tiering */}
        <div className="sm:col-span-2 relative">
          <Layers className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <select
            value={selectedTier}
            onChange={e => onSelectTier(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#0c1015] border border-slate-700 rounded-lg focus:outline-none focus:border-lime-400 text-slate-200 cursor-pointer"
          >
            <option value="all" className="bg-[#111620]">All Tiers</option>
            {tierList.map(tier => (
              <option key={tier} value={tier} className="bg-[#111620]">
                {tier}
              </option>
            ))}
          </select>
        </div>

        {/* Employer / Organizer */}
        {companyList.length > 0 && onSelectCompany && (
          <div className="sm:col-span-2 relative">
            <Building2 className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <select
              value={selectedCompany}
              onChange={e => onSelectCompany(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#0c1015] border border-slate-700 rounded-lg focus:outline-none focus:border-lime-400 text-slate-200 cursor-pointer"
            >
              <option value="all" className="bg-[#111620]">All Employers</option>
              {companyList.map(c => (
                <option key={c} value={c} className="bg-[#111620]">
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
