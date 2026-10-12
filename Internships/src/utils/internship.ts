import { Internship } from '../types/internship';

// Older records used Rejected as their stage and have no saved prior stage.
export const isRejected = (internship: Internship) =>
  Boolean(internship.rejected || internship.status === 'Rejected');
