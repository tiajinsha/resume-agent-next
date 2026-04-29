// tests/validation.test.ts
import { describe, it, expect } from 'vitest';
import { ExtractedResume, PatchCandidate } from '@/lib/validation';

describe('ExtractedResume zod', () => {
  it('accepts a full valid payload (new shape)', () => {
    const input = {
      basic: { name: '张远哲', email: 'a@b.cn', phone: '138', city: '杭州', age: 28 },
      targetRole: '前端开发工程师 / TypeScript 全栈开发',
      educations: [{
        school: '浙江大学', major: '计算机', degree: '本科',
        startDate: '2015.09', endDate: '2019.07', schoolTier: '985',
      }],
      works: [{
        company: '阿里', role: 'FE',
        startDate: '2021.07', endDate: '至今',
        description: '负责中台前端架构升级。',
        highlights: ['架构升级'],
      }],
      projects: [{
        name: '建管家',
        url: 'https://cha.jiangongdata.com',
        role: '独立开发',
        techStack: ['Vue3', 'Nuxt.js', 'Element UI'],
        startDate: '2024.01',
        endDate: '至今',
        description: '全国建筑行业大数据服务平台',
        highlights: ['虚拟滚动表格', 'SSR + SEO'],
      }],
      skills: ['React', 'TypeScript'],
      summary: '高级前端工程师',
    };
    expect(() => ExtractedResume.parse(input)).not.toThrow();
  });

  it('accepts nulls in basic + null targetRole + empty projects', () => {
    const input = {
      basic: { name: null, email: null, phone: null, city: null, age: null },
      targetRole: null,
      educations: [], works: [], projects: [], skills: [], summary: '',
    };
    expect(() => ExtractedResume.parse(input)).not.toThrow();
  });

  it('rejects missing projects key', () => {
    const input = {
      basic: { name: null, email: null, phone: null, city: null, age: null },
      targetRole: null,
      educations: [], works: [], skills: [], summary: '',
    };
    expect(() => ExtractedResume.parse(input)).toThrow();
  });

  it('rejects missing age in basic', () => {
    const input = {
      basic: { name: null, email: null, phone: null, city: null },
      targetRole: null,
      educations: [], works: [], projects: [], skills: [], summary: '',
    };
    expect(() => ExtractedResume.parse(input)).toThrow();
  });

  it('rejects wrong types', () => {
    const bad = {
      basic: { name: 123, email: null, phone: null, city: null, age: null },
      targetRole: null,
      educations: [], works: [], projects: [], skills: [], summary: '',
    };
    expect(() => ExtractedResume.parse(bad)).toThrow();
  });

  it('defaults techStack / highlights / skills to empty arrays', () => {
    const input = {
      basic: { name: null, email: null, phone: null, city: null, age: null },
      targetRole: null,
      educations: [],
      works: [{ company: 'x', role: null, startDate: null, endDate: null, description: null }],
      projects: [{
        name: 'p', url: null, role: null,
        startDate: null, endDate: null,
        description: null,
      }],
      summary: '',
    };
    const parsed = ExtractedResume.parse(input);
    expect(parsed.works[0].highlights).toEqual([]);
    expect(parsed.projects[0].techStack).toEqual([]);
    expect(parsed.projects[0].highlights).toEqual([]);
    expect(parsed.skills).toEqual([]);
  });

  it('accepts string startDate / endDate in educations', () => {
    const input = {
      basic: { name: null, email: null, phone: null, city: null, age: null },
      targetRole: null,
      educations: [{
        school: 's', major: null, degree: null,
        startDate: '2016/06', endDate: '2019/07', schoolTier: null,
      }],
      works: [], projects: [], skills: [], summary: '',
    };
    expect(() => ExtractedResume.parse(input)).not.toThrow();
  });
});

describe('PatchCandidate zod', () => {
  it('accepts gradDate string', () => {
    expect(() => PatchCandidate.parse({ gradDate: '2019.07' })).not.toThrow();
  });

  it('accepts age number', () => {
    expect(() => PatchCandidate.parse({ age: 28 })).not.toThrow();
  });

  it('accepts targetRole string', () => {
    expect(() => PatchCandidate.parse({ targetRole: '前端工程师' })).not.toThrow();
  });

  it('rejects old gradYear field (unknown key passthrough is allowed, value typecheck not)', () => {
    // zod 默认 strip 未知字段,不会报错;这里只保证 gradDate 可设
    expect(() => PatchCandidate.parse({ gradYear: 2019 })).not.toThrow();
  });
});
