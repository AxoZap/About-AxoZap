import React from 'react';
import { ApplicationStatus } from '../types/internship';
import { statusConfig } from './StatusBadge';
import { ChevronDown } from 'lucide-react';

interface StatusDropdownProps {
  status: ApplicationStatus;
  onChange: (status: ApplicationStatus) => void;
}

const allStatuses: ApplicationStatus[] = [
  'Applied',
  'OA Received',
  'OA Completed',
  'Interview Scheduled',
  'Final Round',
  'Offer',
  'Rejected',
  'Withdrawn',
  'Bookmarked',
];

export const StatusDropdown: React.FC<StatusDropdownProps> = ({ status, onChange }) => {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  return (
    <div className="relative inline-flex items-center">
      {/* Visual Badge Display */}
      <div
        className={`pointer-events-none inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
      </div>

      {/* Invisible Native Select Layer Over Badge */}
      <select
        value={status}
        onChange={(e) => onChange(e.target.value as ApplicationStatus)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
        title="Change Status"
      >
        {allStatuses.map((st) => (
          <option key={st} value={st} className="bg-slate-900 text-slate-100 py-1">
            {st}
          </option>
        ))}
      </select>
    </div>
  );
};
