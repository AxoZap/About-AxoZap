export type ApplicationStatus =
  | 'Bookmarked'
  | 'Applied'
  | 'OA Received'
  | 'OA Completed'
  | 'Interview Scheduled'
  | 'Final Round'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn';

export type WorkModel = 'Remote' | 'Hybrid' | 'On-site';

export type TermSeason = 'Summer 2027' | 'Fall 2027' | 'Spring 2028' | 'Summer 2028' | 'Off-Season' | 'Full-Time';

export interface Internship {
  id: string;
  company: string;
  role: string;
  location: string;
  workModel: WorkModel;
  season: TermSeason;
  dateApplied: string; // YYYY-MM-DD
  status: ApplicationStatus;
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
