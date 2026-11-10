export const applicationStatuses = [
  'Applied',
  'OA',
  'Interview Round',
  'Offer',
  'Withdrawn',
  'Bookmarked',
] as const;

export type ApplicationStatus = typeof applicationStatuses[number];

export interface StatusHistoryEntry {
  status: ApplicationStatus;
  interviewRound?: string;
  rejected: boolean;
  recordedAt: string;
  baseline: boolean;
}

export type WorkModel = 'Remote' | 'Hybrid' | 'On-site';

export const termSeasons = ['Winter 2026-2027', 'Summer 2027', 'Fall 2027', 'Spring 2028', 'Summer 2028', 'Full-Time', 'Off-Season'] as const;

export type TermSeason = typeof termSeasons[number];

export interface Internship {
  id: string;
  company: string;
  role: string;
  location: string;
  workModel: WorkModel;
  season: TermSeason;
  dateApplied: string; // YYYY-MM-DD
  status: ApplicationStatus;
  interviewRound?: string;
  rejected?: boolean;
  statusHistory?: StatusHistoryEntry[];
  jobUrl?: string;
  portalUrl?: string;
  salary?: string;
  notes?: string;
  contactEmail?: string;
  updatedAt: string;
}

export interface InternshipStats {
  total: number;
  applied: number;
  interviews: number;
  offers: number;
  rejected: number;
  active: number;
}
