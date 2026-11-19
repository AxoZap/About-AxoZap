import type { ApplicationStatus, Internship, OverallStatus, ProgressStage } from '../types/internship';

export type StatusSelection = Pick<Internship, 'status' | 'interviewRound' | 'rejected' | 'cancelled' | 'statusHistory'>;
export type StatusChange = Pick<Internship, 'status' | 'interviewRound' | 'rejected' | 'cancelled'>;

// Keep the existing D1 stage and outcome fields, including all recorded history.
export function overallStatus(item: Pick<Internship, 'status' | 'rejected' | 'cancelled'>): OverallStatus {
  if (item.status === 'Removed') return 'Removed';
  if (item.cancelled || item.status === 'Withdrawn') return 'Withdrawn';
  if (item.rejected) return 'Rejected';
  if (item.status === 'Bookmarked' || item.status === 'Offer') return item.status;
  return 'Applied';
}

export const isRejected = (item: Internship) => overallStatus(item) === 'Rejected';
export const isCancelled = (item: Internship) => overallStatus(item) === 'Withdrawn';

export function progressStatus(item: StatusSelection): ApplicationStatus {
  if (['Applied', 'OA', 'Interview Round'].includes(item.status)) return item.status;
  return [...(item.statusHistory ?? [])].reverse()
    .find(entry => entry.status === 'OA' || entry.status === 'Interview Round')?.status || 'Applied';
}

export function progressStage(item: StatusSelection): ProgressStage {
  const status = progressStatus(item);
  return status === 'OA' ? 'Assessment' : status === 'Interview Round' ? 'Interview' : 'Application';
}

export function matchesStatusFilter(item: Internship, filter: string): boolean {
  if (filter === 'All') return true;
  const main = overallStatus(item);
  if (filter === 'Closed') return main === 'Withdrawn' || main === 'Removed';
  if (['Application', 'Assessment', 'Interview'].includes(filter)) {
    return main === 'Applied' && progressStage(item) === filter;
  }
  return main === filter;
}

export const hasProgressedPastApplied = (item: Pick<Internship, 'status' | 'statusHistory'>) =>
  ['OA', 'Interview Round', 'Offer'].includes(item.status) ||
  Boolean(item.statusHistory?.some(entry => ['OA', 'Interview Round', 'Offer'].includes(entry.status)));

export const statusLabel = (status: ApplicationStatus | 'Rejected' | 'Cancelled') =>
  status === 'Interview Round' ? 'Interview' : status === 'OA' ? 'Assessment' : status === 'Cancelled' ? 'Withdrawn' : status;

export const hasRounds = (status: ApplicationStatus) => status === 'Interview Round' || status === 'OA';

// Reuse a saved number; choosing a status never increments it.
export function savedStageRound(item: Pick<Internship, 'status' | 'interviewRound' | 'statusHistory'>, status: ApplicationStatus): string {
  if (!hasRounds(status)) return '';
  if (item.status === status) return item.interviewRound || '';
  return [...(item.statusHistory ?? [])].reverse().find(entry => entry.status === status)?.interviewRound || '';
}

export function changeOverallStatus(item: StatusSelection, next: OverallStatus): StatusChange {
  const status = next === 'Offer' || next === 'Bookmarked' || next === 'Removed' ? next : progressStatus(item);
  return {
    status,
    interviewRound: savedStageRound(item, status) || undefined,
    rejected: next === 'Rejected',
    cancelled: next === 'Withdrawn',
  };
}

export function changeProgressStage(item: StatusSelection, stage: ProgressStage): StatusChange {
  const status = stage === 'Assessment' ? 'OA' : stage === 'Interview' ? 'Interview Round' : 'Applied';
  return { status, interviewRound: savedStageRound(item, status) || undefined, rejected: false, cancelled: false };
}

export function statusCounts(items: Internship[]) {
  const counts: Record<OverallStatus, number> = { Applied: 0, Rejected: 0, Withdrawn: 0, Removed: 0, Bookmarked: 0, Offer: 0 };
  for (const item of items) counts[overallStatus(item)] += 1;
  return counts;
}

// Fixed chronological term order; the chosen table sort applies within a term.
export function compareTimeFrames(a: string, b: string): number {
  const start = (term: string) => {
    const year = term.match(/\b(20\d{2})\b/);
    const months: Record<string, number> = { Winter: 12, Spring: 3, Summer: 6, Fall: 9 };
    const month = months[term.split(' ')[0]];
    return year && month ? Number(year[1]) * 12 + month : Number.MAX_SAFE_INTEGER;
  };
  return start(a) - start(b) || a.localeCompare(b, undefined, { numeric: true });
}

export function compareInternships(a: Internship, b: Internship, field: 'dateApplied' | 'company' | 'status' | 'updatedAt', order: 'asc' | 'desc'): number {
  const term = compareTimeFrames(a.season, b.season);
  if (term) return term;
  const value = field === 'status'
    ? overallStatus(a).localeCompare(overallStatus(b)) || progressStage(a).localeCompare(progressStage(b))
    : (a[field] || '').localeCompare(b[field] || '');
  return (order === 'asc' ? value : -value) || a.company.localeCompare(b.company) || a.id.localeCompare(b.id);
}

export function flowTimeFrames(items: Internship[]): string[] {
  return [...new Set(items.map(item => item.season).filter(Boolean))].sort(compareTimeFrames);
}

export function applicationsInTimeFrame(items: Internship[], timeFrame: string): Internship[] {
  return timeFrame === 'All' ? items : items.filter(item => item.season === timeFrame);
}
