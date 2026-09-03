import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { ApplicationStatus } from '../types/internship';
import { statusConfig } from './StatusBadge';

interface StatusDropdownProps {
  status: ApplicationStatus;
  onChange: (status: ApplicationStatus) => void;
}

const allStatuses: ApplicationStatus[] = [
  'Bookmarked',
  'Applied',
  'OA Received',
  'OA Completed',
  'Interview Scheduled',
  'Final Round',
  'Offer',
  'Rejected',
  'Withdrawn',
];

export const StatusDropdown: React.FC<StatusDropdownProps> = ({ status, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cfg = statusConfig[status] || statusConfig['Applied'];
  const Icon = cfg.icon;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${cfg.bg} ${cfg.text} ${cfg.border} hover:opacity-95 shadow-sm active:scale-95`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-48 rounded-xl bg-slate-850 bg-slate-900 border border-slate-700 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Update Status
          </div>
          {allStatuses.map((st) => {
            const itemCfg = statusConfig[st];
            const ItemIcon = itemCfg.icon;
            const isSelected = st === status;

            return (
              <button
                key={st}
                type="button"
                onClick={() => {
                  onChange(st);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors hover:bg-slate-800 ${
                  isSelected ? `${itemCfg.text} font-bold bg-slate-800/50` : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${itemCfg.dot}`} />
                  <ItemIcon className="w-3.5 h-3.5" />
                  <span>{st}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
