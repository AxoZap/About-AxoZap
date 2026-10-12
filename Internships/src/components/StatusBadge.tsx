import React from 'react';
import { ApplicationStatus } from '../types/internship';
import { 
  Bookmark, 
  Send, 
  Code2, 
  Calendar, 
  Trophy, 
  XCircle, 
  Ban 
} from 'lucide-react';

interface StatusBadgeProps {
  status: ApplicationStatus | 'Rejected';
  size?: 'sm' | 'md';
}

export const statusConfig: Record<
  ApplicationStatus | 'Rejected',
  { bg: string; text: string; border: string; dot: string; icon: React.ComponentType<{ className?: string }> }
> = {
  'Bookmarked': {
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-700',
    dot: 'bg-slate-400',
    icon: Bookmark,
  },
  'Applied': {
    bg: 'bg-blue-950/40',
    text: 'text-blue-300',
    border: 'border-blue-800/50',
    dot: 'bg-blue-400',
    icon: Send,
  },
  'OA': {
    bg: 'bg-purple-950/40',
    text: 'text-purple-300',
    border: 'border-purple-800/50',
    dot: 'bg-purple-400',
    icon: Code2,
  },
  'Interview Round': {
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    border: 'border-amber-800/50',
    dot: 'bg-amber-400',
    icon: Calendar,
  },
  'Offer': {
    bg: 'bg-emerald-950/50',
    text: 'text-emerald-300',
    border: 'border-emerald-700/60',
    dot: 'bg-emerald-400',
    icon: Trophy,
  },
  'Rejected': {
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    border: 'border-rose-900/50',
    dot: 'bg-rose-400',
    icon: XCircle,
  },
  'Withdrawn': {
    bg: 'bg-neutral-900/50',
    text: 'text-neutral-400',
    border: 'border-neutral-800',
    dot: 'bg-neutral-500',
    icon: Ban,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const cfg = statusConfig[status] || statusConfig['Applied'];
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-sm ${cfg.bg} ${cfg.text} ${cfg.border} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{status}</span>
    </span>
  );
};
