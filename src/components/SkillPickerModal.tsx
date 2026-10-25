'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Code2, Sparkles, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { POPULAR_TECH_SKILLS, getUserSkills, saveUserSkills, TechSkill } from '@/lib/skillMatcher';

interface SkillPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillsUpdated: (skills: string[]) => void;
}

export default function SkillPickerModal({
  isOpen,
  onClose,
  onSkillsUpdated,
}: SkillPickerModalProps) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedSkills(getUserSkills());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleSave = () => {
    saveUserSkills(selectedSkills);
    onSkillsUpdated(selectedSkills);
    onClose();
  };

  const handleClear = () => {
    setSelectedSkills([]);
    saveUserSkills([]);
    onSkillsUpdated([]);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-[#111620] text-slate-100 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0c1015]">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Code2 className="w-4 h-4 text-lime-400" />
              <span>Select Your Tech Stack & Skills</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Select languages, frameworks, and domains you specialize in or want to learn. The platform will compute
              personalized match percentages for every conference, job, workshop, and hackathon.
            </p>

            <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {POPULAR_TECH_SKILLS.map(skill => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-lime-400 text-slate-950 border-lime-400 font-bold shadow-sm'
                        : 'bg-[#0c1015] text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>{skill}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Clear All
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-lime-400 hover:bg-lime-300 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  Save Tech Stack ({selectedSkills.length})
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
