export const SECTION_KEYS = [
  'basic',
  'targetRole',
  'educations',
  'works',
  'projects',
  'skills',
  'summary',
  'selfEvaluation',
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];
