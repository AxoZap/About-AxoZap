import type { ApplicationStatus, Internship } from '../types/internship';

const stages: { status: ApplicationStatus; label: string; pending: string; color: string }[] = [
  { status: 'Applied', label: 'Applied', pending: 'Awaiting response', color: '#d99b35' },
  { status: 'OA', label: 'Online assessment', pending: 'Assessment stage', color: '#5695c8' },
  { status: 'Interview Round', label: 'Interview', pending: 'Interviewing', color: '#8b78d2' },
  { status: 'Offer', label: 'Offer', pending: 'Offer received', color: '#41a584' },
  { status: 'Withdrawn', label: 'Withdrawn', pending: 'Withdrawn', color: '#8493a6' },
];

export function buildApplicationFlow(internships: Internship[]) {
  const groups = stages.map(stage => {
    const applications = internships.filter(item => item.status === stage.status);
    const rejected = applications.filter(item => Boolean(item.rejected)).length;
    return {
      ...stage,
      count: applications.length,
      outcomes: [
        { key: 'rejected', label: 'Rejected', count: rejected, color: '#d46d7e' },
        { key: stage.status, label: stage.pending, count: applications.length - rejected, color: stage.color },
      ].filter(outcome => outcome.count > 0),
    };
  }).filter(group => group.count > 0);

  const rejected = groups.reduce((total, group) => total + (group.outcomes.find(outcome => outcome.key === 'rejected')?.count ?? 0), 0);
  const outcomes = [
    { key: 'rejected', label: 'Rejected', count: rejected, color: '#d46d7e' },
    ...groups.flatMap(group => group.outcomes.filter(outcome => outcome.key !== 'rejected')),
  ].filter(outcome => outcome.count > 0);

  return {
    groups,
    outcomes,
    total: groups.reduce((total, group) => total + group.count, 0),
    bookmarked: internships.filter(item => item.status === 'Bookmarked').length,
  };
}
