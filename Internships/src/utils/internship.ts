import type { ApplicationStatus, Internship } from '../types/internship';

export const isRejected = (internship: Internship) =>
  Boolean(internship.rejected);

export const isCancelled = (internship: Internship) =>
  Boolean(internship.cancelled);

export function matchesStatusFilter(internship: Internship, filter: string): boolean {
  if (isCancelled(internship)) return filter === 'Cancelled';
  if (filter === 'Cancelled') return false;
  if (internship.status === 'Withdrawn') return filter === 'Withdrawn';
  if (filter === 'Rejected') return isRejected(internship);
  return !isRejected(internship) && (filter === 'All' || internship.status === filter);
}

export const hasProgressedPastApplied = (internship: Pick<Internship, 'status' | 'statusHistory'>) =>
  ['OA', 'Interview Round', 'Offer', 'Withdrawn'].includes(internship.status) ||
  Boolean(internship.statusHistory?.some(entry => ['OA', 'Interview Round', 'Offer', 'Withdrawn'].includes(entry.status)));

export const statusLabel = (status: ApplicationStatus | 'Rejected' | 'Cancelled') =>
  status === 'Interview Round' ? 'Interview' : status;

export const hasRounds = (status: ApplicationStatus) => status === 'Interview Round' || status === 'OA';

// Reuse the saved round for a stage without advancing it on selection.
export function savedStageRound(internship: Pick<Internship, 'status' | 'interviewRound' | 'statusHistory'>, status: ApplicationStatus): string {
  if (!hasRounds(status)) return '';
  if (internship.status === status) return internship.interviewRound || '';
  return [...(internship.statusHistory ?? [])].reverse().find(entry => entry.status === status)?.interviewRound || '';
}
