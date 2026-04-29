// lib/extraction/derive.ts
import type { ExtractedResume } from '../validation';
import { CANDIDATE_DEGREE_LEVELS } from '../validation';

type WorkItem = ExtractedResume['works'][number];
type EduItem  = ExtractedResume['educations'][number];

export interface FlatFields {
  name:       string | null;
  email:      string | null;
  phone:      string | null;
  city:       string | null;
  age:        number | null;
  targetRole: string | null;
  role:       string | null;
  company:    string | null;
  years:      number | null;
  school:     string | null;
  major:      string | null;
  degree:     string | null;
  gradDate:   string | null;
  skills:     string[];
  summary:    string;
  roleCategory: string | null;
}

export function normalizeDegree(degree: string | null, school: string | null): string | null {
  const d = degree?.trim() ?? '';
  const s = school?.trim() ?? '';

  // 直接匹配学历关键词（AI 提取结果或原文写法）
  if (/博士|phd|doctor/i.test(d))                          return '博士';
  if (/硕士|研究生|master|mba|mpa|mfa|mphil/i.test(d))     return '硕士';
  if (/本科|学士|bachelor|undergraduate/i.test(d))          return '本科';
  if (/大专|专科|associate/i.test(d))                       return '大专';
  if (/高中|high.?school/i.test(d))                         return '高中';
  if (/初中|junior.?middle|middle.?school/i.test(d))        return '初中';

  // AI 已返回合法值，直接使用
  if (CANDIDATE_DEGREE_LEVELS.includes(d as any)) return d;

  // 根据学校名称推断（兜底）
  if (!s) return null;
  if (/职业技术学院|职业学院|职业学校|技工学校|高职|专科学校/.test(s)) return '大专';
  if (/大学|学院/.test(s) && !/职业|技术学院|高职/.test(s))            return '本科';
  if (/高级中学|高中/.test(s))                                           return '高中';
  if (/初级中学|初中/.test(s))                                           return '初中';

  return null;
}

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})(?:[.\-\/](\d{1,2}))?/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = m[2] ? Number(m[2]) : 1;
  if (isNaN(y) || isNaN(mo)) return null;
  return new Date(y, mo - 1, 1);
}

function parseEndDate(s: string | null, now: Date): Date | null {
  if (s === '至今') return now;
  return parseDate(s);
}

function pickLatestEducation(list: EduItem[]): EduItem | null {
  if (list.length === 0) return null;
  return [...list].sort((a, b) => {
    const ae = parseDate(a.endDate)?.getTime() ?? -Infinity;
    const be = parseDate(b.endDate)?.getTime() ?? -Infinity;
    return be - ae;
  })[0];
}

function pickLatestWork(list: WorkItem[], now = new Date()): WorkItem | null {
  if (list.length === 0) return null;
  return [...list].sort((a, b) => {
    const ae = parseEndDate(a.endDate, now)?.getTime() ?? -Infinity;
    const be = parseEndDate(b.endDate, now)?.getTime() ?? -Infinity;
    return be - ae;
  })[0];
}

export function computeYears(works: WorkItem[], now = new Date()): number | null {
  if (works.length === 0) return null;
  let totalMs = 0;
  let any = false;
  for (const w of works) {
    const s = parseDate(w.startDate);
    const e = parseEndDate(w.endDate, now);
    if (s && e) {
      totalMs += e.getTime() - s.getTime();
      any = true;
    }
  }
  if (!any) return null;
  const years = totalMs / (365.25 * 24 * 3600 * 1000);
  return Math.round(years);
}

export function deriveFlat(data: ExtractedResume, now = new Date()): FlatFields {
  const edu = pickLatestEducation(data.educations);
  const work = pickLatestWork(data.works, now);
  return {
    name:       data.basic.name,
    email:      data.basic.email,
    phone:      data.basic.phone,
    city:       data.basic.city,
    age:        data.basic.age,
    targetRole: data.targetRole,
    role:       work?.role ?? null,
    company:    work?.company ?? null,
    years:      computeYears(data.works, now),
    school:     edu?.school ?? null,
    major:      edu?.major ?? null,
    degree:     normalizeDegree(edu?.degree ?? null, edu?.school ?? null),
    gradDate:   edu?.endDate ?? null,
    skills:     data.skills,
    summary:    data.summary,
    roleCategory: data.roleCategory ?? null,
  };
}
