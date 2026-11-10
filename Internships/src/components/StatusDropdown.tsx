import React, { useEffect, useState } from 'react';
import { ApplicationStatus, applicationStatuses } from '../types/internship';
import { hasRounds, statusLabel } from '../utils/internship';
import { statusConfig } from './StatusBadge';
import { ChevronDown } from 'lucide-react';

interface StatusDropdownProps {
  status: ApplicationStatus;
  interviewRound?: string;
  onRoundChange: (round: string) => void | Promise<void>;
  appliedDisabled?: boolean;
  onChange: (status: ApplicationStatus) => void | Promise<void>;
}

export const StatusDropdown: React.FC<StatusDropdownProps> = ({ status, interviewRound, appliedDisabled, onChange, onRoundChange }) => {
  const [saving, setSaving] = useState(false);
  const [showRound, setShowRound] = useState(false);
  const [round, setRound] = useState(interviewRound || '');
  useEffect(() => setRound(interviewRound || ''), [status, interviewRound]);
  const saveRound = async () => {
    if (round.trim() === (interviewRound || '')) return;
    setSaving(true);
    try { await onRoundChange(round.trim()); } finally { setSaving(false); }
  };
  const cfg = statusConfig[status] || statusConfig.Applied;
  const Icon = cfg.icon;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="relative inline-flex items-center">
        <div className={`pointer-events-none inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm ${saving ? 'opacity-50' : ''}`}>
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span>{statusLabel(status)}</span>
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
        </div>
        <select
          // Reset the native selection so choosing the current stage fires again.
          value=""
          disabled={saving}
          onChange={async (event) => {
            const selected = event.target.value as ApplicationStatus;
            event.target.value = '';
            setSaving(true);
            try { await onChange(selected); setShowRound(hasRounds(selected)); } finally { setSaving(false); }
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs disabled:cursor-wait"
          title="Change Status"
          aria-label="Change status"
        >
          <option value="" disabled hidden>{statusLabel(status)}</option>
          {applicationStatuses.map((st) => (
            <option key={st} value={st} disabled={st === 'Applied' && appliedDisabled} className="bg-slate-900 text-slate-100 py-1">
              {statusLabel(st)}
            </option>
          ))}
        </select>
      </div>
      {showRound && hasRounds(status) && (
        <input type="text" inputMode="numeric" value={round} disabled={saving}
          onChange={event => setRound(event.target.value)}
          onBlur={() => { void saveRound(); }}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }}
          aria-label={`${statusLabel(status)} round`} placeholder="Round number"
          className="w-24 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50" />
      )}
    </div>
  );
};
