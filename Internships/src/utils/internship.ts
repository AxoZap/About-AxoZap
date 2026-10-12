import { Internship } from '../types/internship';

export const isRejected = (internship: Internship) =>
  Boolean(internship.rejected);
