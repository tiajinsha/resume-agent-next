// tests/extraction-fixtures.test.ts
import { describe, it, expect } from 'vitest';
import { ExtractedResume } from '@/lib/validation';
import { deriveFlat } from '@/lib/extraction/derive';
import { RESUME_SECTION_CLEAN } from './fixtures/resume-section-clean';
import { RESUME_SECTION_EMBEDDED } from './fixtures/resume-section-embedded';

describe('fixture: section-clean (田金沙 风格)', () => {
  it('passes schema validation', () => {
    expect(() => ExtractedResume.parse(RESUME_SECTION_CLEAN)).not.toThrow();
  });

  it('projects contain 2 entries, all works have empty highlights', () => {
    expect(RESUME_SECTION_CLEAN.projects.length).toBe(2);
    for (const w of RESUME_SECTION_CLEAN.works) {
      expect(w.highlights).toEqual([]);
    }
  });

  it('education months preserved as "YYYY/MM"', () => {
    expect(RESUME_SECTION_CLEAN.educations[0].startDate).toBe('2016/06');
    expect(RESUME_SECTION_CLEAN.educations[0].endDate).toBe('2019/07');
  });

  it('deriveFlat gets targetRole, age, gradDate, latest work', () => {
    const flat = deriveFlat(RESUME_SECTION_CLEAN, new Date('2026-04-24'));
    expect(flat.targetRole).toBe('前端开发工程师 / TypeScript 全栈开发');
    expect(flat.age).toBe(28);
    expect(flat.gradDate).toBe('2019/07');
    expect(flat.company).toBe('开林企业管理');
    expect(flat.role).toBe('前端开发工程师');
    expect(flat.years).toBeGreaterThanOrEqual(5);
  });
});

describe('fixture: section-embedded (项目嵌工作)', () => {
  it('passes schema validation', () => {
    expect(() => ExtractedResume.parse(RESUME_SECTION_EMBEDDED)).not.toThrow();
  });

  it('projects array is empty, works have highlights', () => {
    expect(RESUME_SECTION_EMBEDDED.projects).toEqual([]);
    expect(RESUME_SECTION_EMBEDDED.works[0].highlights.length).toBeGreaterThan(0);
  });

  it('targetRole is null when absent', () => {
    expect(RESUME_SECTION_EMBEDDED.targetRole).toBeNull();
  });

  it('deriveFlat handles null targetRole/age gracefully', () => {
    const flat = deriveFlat(RESUME_SECTION_EMBEDDED);
    expect(flat.targetRole).toBeNull();
    expect(flat.age).toBeNull();
  });
});
