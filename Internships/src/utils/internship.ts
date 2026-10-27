import { Internship } from '../types/internship';

export const isRejected = (internship: Internship) =>
  Boolean(internship.rejected);

export const hasProgressedPastApplied = (internship: Pick<Internship, 'status' | 'statusHistory'>) =>
  ['OA', 'Interview Round', 'Offer', 'Withdrawn'].includes(internship.status) ||
  Boolean(internship.statusHistory?.some(entry => ['OA', 'Interview Round', 'Offer', 'Withdrawn'].includes(entry.status)));
