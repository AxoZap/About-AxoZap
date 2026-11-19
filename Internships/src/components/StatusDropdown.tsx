import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { overallStatuses, progressStages, type OverallStatus, type ProgressStage } from '../types/internship';
import { changeOverallStatus, changeProgressStage, hasProgressedPastApplied, overallStatus, progressStage, progressStatus, savedStageRound, type StatusSelection, type StatusChange } from '../utils/internship';
import { statusConfig } from './StatusBadge';

interface StatusDropdownProps {
  value: StatusSelection;
  onChange: (change: StatusChange) => void | Promise<void>;
  onRoundChange: (round: string) => void | Promise<void>;
}

export function StatusDropdown({ value, onChange, onRoundChange }: StatusDropdownProps) {
  const [saving, setSaving] = useState(false);
  const [showRound, setShowRound] = useState(false);
  const main = overallStatus(value);
  const stage = progressStage(value);
  const storedRound = savedStageRound(value, progressStatus(value));
  const [round, setRound] = useState(storedRound);
  useEffect(() => setRound(storedRound), [storedRound, stage]);
  useEffect(() => setShowRound(false), [main]);
  const cfg = statusConfig[main];
  const Icon = cfg.icon;

  async function saveRound() {
    const trimmed = round.trim();
    if (trimmed === storedRound) return;
    if (trimmed && !/^[1-9]\d*$/.test(trimmed)) { setRound(storedRound); return; }
    setSaving(true);
    try { await onRoundChange(trimmed); } finally { setSaving(false); }
  }

  return <div className="flex flex-col items-start gap-2">
    <div className="relative inline-flex items-center">
      <div className={`pointer-events-none inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border} ${saving ? 'opacity-50' : ''}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" /><span>{main}</span><ChevronDown className="h-3 w-3 shrink-0" />
      </div>
      <select value={main} disabled={saving} aria-label="Overall status" className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onChange={async event => {
          const next = event.target.value as OverallStatus;
          setSaving(true);
          try { await onChange(changeOverallStatus(value, next)); } finally { setSaving(false); }
        }}>
        {overallStatuses.map(status => <option key={status} value={status} className="bg-slate-900 text-slate-100">{status}</option>)}
      </select>
    </div>
    {main === 'Applied' && <div className="w-full space-y-1.5 border-l border-slate-700 pl-2">
      <div className="relative inline-flex max-w-full items-center">
        <span className="pointer-events-none inline-flex items-center gap-1 text-[11px] text-slate-300">{stage}{storedRound && stage !== 'Application' ? ` · ${storedRound}` : ''}<ChevronDown className="h-3 w-3 shrink-0 text-slate-500" /></span>
        <select value="" disabled={saving} aria-label="Application progress" className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={async event => {
            const next = event.target.value as ProgressStage;
            event.target.value = '';
            setSaving(true);
            try { await onChange(changeProgressStage(value, next)); setShowRound(next !== 'Application'); } finally { setSaving(false); }
          }}>
          <option value="" disabled hidden>{stage}</option>
          {progressStages.map(option => <option key={option} value={option} disabled={option === 'Application' && hasProgressedPastApplied(value)} className="bg-slate-900 text-slate-100">{option}</option>)}
        </select>
      </div>
      {showRound && stage !== 'Application' && <input type="number" min="1" step="1" value={/^\d+$/.test(round) ? round : ''} disabled={saving}
        onChange={event => setRound(event.target.value)} onBlur={() => { void saveRound(); }}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }}
        aria-label={`${stage} round`} placeholder="Round"
        className="block w-24 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50" />}
    </div>}
  </div>;
}
