// lib/db/schema.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import type { ExtractedResume } from '../validation';

// ---- Users ----
export const users = sqliteTable('users', {
  id:           text('id').primaryKey(),
  username:     text('username').notNull().unique(),
  displayName:  text('display_name'),
  passwordHash: text('password_hash').notNull(),
  defaultJdId:  text('default_jd_id'),
  createdAt:    integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt:    integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
export type User    = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ---- Sessions ----
export const sessions = sqliteTable('sessions', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
});
export type Session = typeof sessions.$inferSelect;

export const CANDIDATE_STATUS = [
  '待筛选', '初筛通过', '面试中', '已录用', '已淘汰',
] as const;
export type CandidateStatus = typeof CANDIDATE_STATUS[number];

export const EXTRACTION_STATUS = [
  'uploaded', 'extracting', 'parsed', 'error',
] as const;
export type ExtractionStatus = typeof EXTRACTION_STATUS[number];

export const DEGREE_LEVELS = ['不限', '大专', '本科', '硕士', '博士'] as const;
export type DegreeLevel = typeof DEGREE_LEVELS[number];

export interface DimensionScore {
  score:   number;
  comment: string;
}

export interface MatchResult {
  jdId:       string;
  jdTitle:    string;
  overall:    number;
  skill:      DimensionScore;
  experience: DimensionScore;
  education:  DimensionScore;
  summary:    string;
  matchedAt:  number;
  weights:    { skill: number; experience: number; education: number };
}

export const candidates = sqliteTable('candidates', {
  id: text('id').primaryKey(),

  name:      text('name'),
  email:     text('email'),
  phone:     text('phone'),
  city:       text('city'),
  age:        integer('age'),
  targetRole: text('target_role'),
  role:       text('role'),
  company:    text('company'),
  years:      integer('years'),
  school:     text('school'),
  major:      text('major'),
  degree:     text('degree'),
  gradDate:   text('grad_date'),
  skills:     text('skills', { mode: 'json' }).$type<string[]>(),
  summary:   text('summary'),
  roleCategory: text('role_category'),

  extractedJson: text('extracted_json', { mode: 'json' }).$type<ExtractedResume>(),

  status: text('status').$type<CandidateStatus>()
    .notNull().default('待筛选'),
  extractionStatus: text('extraction_status').$type<ExtractionStatus>()
    .notNull().default('uploaded'),
  extractionError:    text('extraction_error'),
  extractionAttempts: integer('extraction_attempts').notNull().default(0),

  matchResults: text('match_results', { mode: 'json' }).$type<MatchResult[]>(),
  userId:       text('user_id').references(() => users.id),

  pdfPath:   text('pdf_path').notNull(),
  pdfSize:   integer('pdf_size').notNull(),
  pdfPages:  integer('pdf_pages'),
  photoPath: text('photo_path'),

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => ({
  extractionStatusIdx: index('idx_candidates_extraction_status').on(t.extractionStatus),
  statusIdx:           index('idx_candidates_status').on(t.status),
  roleCategoryIdx:     index('idx_candidates_role_category').on(t.roleCategory),
  createdAtIdx:        index('idx_candidates_created_at').on(t.createdAt),
}));

export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;

export const jobDescriptions = sqliteTable('job_descriptions', {
  id:             text('id').primaryKey(),
  title:          text('title').notNull(),
  description:    text('description').notNull(),
  requiredSkills: text('required_skills', { mode: 'json' }).$type<string[]>().notNull().$default(() => []),
  bonusSkills:    text('bonus_skills',    { mode: 'json' }).$type<string[]>().notNull().$default(() => []),
  minYears:         integer('min_years'),
  requiredDegree:   text('required_degree').$type<DegreeLevel>().notNull().default('不限'),
  skillWeight:      integer('skill_weight').notNull().default(50),
  experienceWeight: integer('experience_weight').notNull().default(35),
  educationWeight:  integer('education_weight').notNull().default(15),
  userId:           text('user_id').references(() => users.id),
  createdAt:        integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt:        integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => ({
  createdAtIdx: index('idx_jd_created_at').on(t.createdAt),
}));

export type JobDescription    = typeof jobDescriptions.$inferSelect;
export type NewJobDescription = typeof jobDescriptions.$inferInsert;
