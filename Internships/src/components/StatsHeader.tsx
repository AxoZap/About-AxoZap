import { GitFork } from 'lucide-react';
import { overallStatuses, type Internship } from '../types/internship';
import { statusCounts } from '../utils/internship';
import { statusConfig } from './StatusBadge';

interface StatsHeaderProps {
  internships: Internship[];
  onShowFlow: () => void;
  flowDisabled?: boolean;
}

export function StatsHeader({ internships, onShowFlow, flowDisabled }: StatsHeaderProps) {
  const counts = statusCounts(internships);
  const stats = [{ label: 'Total', count: internships.length, color: 'text-slate-100' },
    ...overallStatuses.map(status => ({ label: status, count: counts[status], color: statusConfig[status].text }))];
  return <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
    {stats.map(stat => <div key={stat.label} className="flex items-baseline gap-2">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{stat.label}</span>
      <span className={`text-lg font-bold ${stat.color}`}>{stat.count}</span>
    </div>)}
    <button onClick={onShowFlow} disabled={flowDisabled} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">
      <GitFork className="h-3.5 w-3.5" />Flow diagram
    </button>
  </div>;
}
