import React from 'react';
import { Internship } from '../types/internship';

interface StatsHeaderProps {
  internships: Internship[];
}

export const StatsHeader: React.FC<StatsHeaderProps> = ({ internships }) => {
  const total = internships.length;
  const applied = internships.filter(i => i.status !== 'Bookmarked').length;
  const pending = internships.filter(i => ['Applied', 'OA Received', 'OA Completed'].includes(i.status)).length;
  const interviews = internships.filter(i => ['Interview Scheduled', 'Final Round'].includes(i.status)).length;
  const offers = internships.filter(i => i.status === 'Offer').length;

  return (
    <div className="flex flex-wrap items-center gap-6 py-3 px-4 rounded-xl bg-slate-900/60 border border-slate-800 text-sm mb-6">
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total:</span>
        <span className="text-lg font-bold text-slate-100">{applied}</span>
        <span className="text-xs text-slate-500">({total} tracked)</span>
      </div>

      <div className="h-4 w-px bg-slate-800 hidden sm:block" />

      <div className="flex items-baseline gap-2">
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Pre-Interview:</span>
        <span className="text-lg font-bold text-amber-300">{pending}</span>
      </div>

      <div className="h-4 w-px bg-slate-800 hidden sm:block" />

      <div className="flex items-baseline gap-2">
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Interviews:</span>
        <span className="text-lg font-bold text-indigo-300">{interviews}</span>
      </div>

      <div className="h-4 w-px bg-slate-800 hidden sm:block" />

      <div className="flex items-baseline gap-2">
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Offers:</span>
        <span className="text-lg font-bold text-emerald-400">{offers}</span>
      </div>
    </div>
  );
};
