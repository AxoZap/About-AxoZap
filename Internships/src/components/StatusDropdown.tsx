import React, { useEffect, useState } from 'react';
import { ApplicationStatus, applicationStatuses } from '../types/internship';
import { statusConfig } from './StatusBadge';
import { ChevronDown } from 'lucide-react';

interface StatusDropdownProps {
  status: ApplicationStatus;
  interviewRound?: string;
  onChange: (status: ApplicationStatus) => void;
  onInterviewRoundChange: (round: string) => void;
}

export const StatusDropdown: React.FC<StatusDropdownProps> = ({ status, interviewRound, onChange, onInterviewRoundChange }) => {
  const [round, setRound] = useState(interviewRound || '');
  useEffect(() => setRound(status === 'Interview Round' ? interviewRound || '' : ''), [status, interviewRound]);
  const cfg = statusConfig[status] || statusConfig.Applied;
  const Icon = cfg.icon;

  return (
    <div className="flex flex-col items-start gap-1.5">
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
          {applicationStatuses.map((st) => (
            <option key={st} value={st} className="bg-slate-900 text-slate-100 py-1">
              {st}
            </option>
          ))}
        </select>
      </div>
      {status === 'Interview Round' && (
        <input
          type="text"
          value={round}
          onChange={(e) => setRound(e.target.value)}
          onBlur={() => {
            if (round.trim() !== (interviewRound || '')) onInterviewRoundChange(round);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          placeholder="Type in round"
          aria-label="Interview round"
          className="w-36 bg-slate-950/60 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      )}
    </div>
  );
};
