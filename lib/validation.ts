// lib/validation.ts
import { z } from 'zod';

export const ExtractedResume = z.object({
  basic: z.object({
    name:  z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    city:  z.string().nullable(),
    age:   z.number().int().nullable(),
  }),
  targetRole: z.string().nullable(),
  educations: z.array(z.object({
    school:     z.string(),
    major:      z.string().nullable(),
    degree:     z.string().nullable(),
    startDate:  z.string().nullable(),
    endDate:    z.string().nullable(),
    schoolTier: z.enum(['985', '211', '一本', '二本', '三本', '大专']).nullable(),
  })),
  works: z.array(z.object({
    company:     z.string(),
    role:        z.string().nullable(),
    startDate:   z.string().nullable(),
    endDate:     z.string().nullable(),
    description: z.string().nullable(),
    highlights:  z.array(z.string()).default([]),
  })),
  projects: z.array(z.object({
    name:        z.string(),
    url:         z.string().nullable(),
    role:        z.string().nullable(),
    techStack:   z.array(z.string()).default([]),
    startDate:   z.string().nullable(),
    endDate:     z.string().nullable(),
    description: z.string().nullable(),
    highlights:  z.array(z.string()).default([]),
    aiSummary:   z.string().nullable().optional(),
    valueTag:    z.string().nullable().optional(),
  })),
  skills:           z.array(z.string()).default([]),
  summary:          z.string(),
  selfEvaluation:   z.string().nullable().optional(),
  roleCategory:     z.enum(['前端','后端','全栈','移动端','测试/QA','运维/DevOps','算法/AI','数据','产品','设计','管理','其他']).nullable().optional(),
  projectEvalFailed: z.boolean().optional(),
});

export const ROLE_CATEGORIES = ['前端','后端','全栈','移动端','测试/QA','运维/DevOps','算法/AI','数据','产品','设计','管理','其他'] as const;
export type RoleCategory = typeof ROLE_CATEGORIES[number];
export type ExtractedResume = z.infer<typeof ExtractedResume>;

// ---- API 请求体 schema ----
export const PatchCandidate = z.object({
  name:       z.string().nullable().optional(),
  email:      z.string().nullable().optional(),
  phone:      z.string().nullable().optional(),
  city:       z.string().nullable().optional(),
  age:        z.number().int().nullable().optional(),
  targetRole: z.string().nullable().optional(),
  role:       z.string().nullable().optional(),
  company:    z.string().nullable().optional(),
  years:      z.number().int().nullable().optional(),
  school:     z.string().nullable().optional(),
  major:      z.string().nullable().optional(),
  degree:     z.string().nullable().optional(),
  gradDate:   z.string().nullable().optional(),
  skills:     z.array(z.string()).optional(),
  summary:    z.string().optional(),
  status:     z.enum(['待筛选', '初筛通过', '面试中', '已录用', '已淘汰']).optional(),
});
export type PatchCandidateBody = z.infer<typeof PatchCandidate>;

// ---- 学历常量 ----
// 候选人实际学历（6 档，不含"不限"）
export const CANDIDATE_DEGREE_LEVELS = ['初中', '高中', '大专', '本科', '硕士', '博士'] as const;
export type CandidateDegree = typeof CANDIDATE_DEGREE_LEVELS[number];

// JD 学历要求（含"不限"，从大专起算，初高中岗位实际无需限制）
export const DEGREE_LEVELS = ['不限', '大专', '本科', '硕士', '博士'] as const;

export const UpsertJD = z.object({
  title:            z.string().min(1).max(100),
  description:      z.string().min(1).max(5000),
  requiredSkills:   z.array(z.string()).default([]),
  bonusSkills:      z.array(z.string()).default([]),
  minYears:         z.number().int().min(0).nullable().optional(),
  requiredDegree:   z.enum(DEGREE_LEVELS).default('不限'),
  skillWeight:      z.number().int().min(0).max(100).default(50),
  experienceWeight: z.number().int().min(0).max(100).default(35),
  educationWeight:  z.number().int().min(0).max(100).default(15),
}).refine(
  d => d.skillWeight + d.experienceWeight + d.educationWeight === 100,
  { message: '三个维度权重之和必须为 100', path: ['skillWeight'] },
);
export type UpsertJDBody = z.infer<typeof UpsertJD>;

// ---- 项目 AI 评估响应 ----
export const ProjectEvalItem = z.object({
  aiSummary: z.string(),
  valueTag:  z.string().nullable(),
});
export const ProjectEvalResponse = z.array(ProjectEvalItem);
export type ProjectEvalItemType = z.infer<typeof ProjectEvalItem>;

// ---- AI 匹配响应（overall 由服务端按 JD 权重计算，AI 不输出）----
export const MatchAIResponse = z.object({
  skill:      z.object({ score: z.number().int().min(0).max(100), comment: z.string() }),
  experience: z.object({ score: z.number().int().min(0).max(100), comment: z.string() }),
  education:  z.object({ score: z.number().int().min(0).max(100), comment: z.string() }),
  summary:    z.string(),
});
export type MatchAIResponseData = z.infer<typeof MatchAIResponse>;
