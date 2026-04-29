// tests/derive.test.ts
import { describe, it, expect } from 'vitest';
import { deriveFlat, computeYears } from '@/lib/extraction/derive';
import type { ExtractedResume } from '@/lib/validation';

const base: ExtractedResume = {
  basic: { name: '张远哲', email: 'a@b.cn', phone: '138', city: '杭州', age: 28 },
  targetRole: '前端工程师',
  educations: [],
  works: [],
  projects: [],
  skills: ['React'],
  summary: 'hi',
};

describe('deriveFlat', () => {
  it('fills basic fields including age/targetRole', () => {
    const flat = deriveFlat(base);
    expect(flat.name).toBe('张远哲');
    expect(flat.email).toBe('a@b.cn');
    expect(flat.phone).toBe('138');
    expect(flat.city).toBe('杭州');
    expect(flat.age).toBe(28);
    expect(flat.targetRole).toBe('前端工程师');
    expect(flat.skills).toEqual(['React']);
    expect(flat.summary).toBe('hi');
  });

  it('picks newest education by endDate desc (string dates)', () => {
    const e: ExtractedResume = {
      ...base,
      educations: [
        { school: '本科校', major: 'CS', degree: '本科', startDate: '2011.09', endDate: '2015.07' },
        { school: '硕士校', major: 'CS', degree: '硕士', startDate: '2015.09', endDate: '2018.07' },
      ],
    };
    const flat = deriveFlat(e);
    expect(flat.school).toBe('硕士校');
    expect(flat.degree).toBe('硕士');
    expect(flat.gradDate).toBe('2018.07');
  });

  it('picks newest work; "至今" treated as latest', () => {
    const w: ExtractedResume = {
      ...base,
      works: [
        { company: '前公司', role: 'A', startDate: '2018.01', endDate: '2020.06', highlights: [] },
        { company: '现公司', role: 'B', startDate: '2020.07', endDate: '至今', highlights: [] },
      ],
    };
    const flat = deriveFlat(w);
    expect(flat.company).toBe('现公司');
    expect(flat.role).toBe('B');
  });

  it('returns null flat fields when arrays empty', () => {
    const flat = deriveFlat(base);
    expect(flat.school).toBeNull();
    expect(flat.gradDate).toBeNull();
    expect(flat.company).toBeNull();
    expect(flat.years).toBeNull();
  });

  it('age and targetRole default to null when missing in basic / top-level', () => {
    const b: ExtractedResume = {
      ...base,
      basic: { ...base.basic, age: null },
      targetRole: null,
    };
    const flat = deriveFlat(b);
    expect(flat.age).toBeNull();
    expect(flat.targetRole).toBeNull();
  });
});

describe('computeYears (date format variants)', () => {
  it('accepts "2018.01" format', () => {
    const years = computeYears([
      { company: 'x', role: null, startDate: '2018.01', endDate: '2020.01', highlights: [] },
      { company: 'y', role: null, startDate: '2020.07', endDate: '2023.07', highlights: [] },
    ]);
    expect(years).toBe(5);
  });

  it('accepts "2018/01" format', () => {
    const years = computeYears([
      { company: 'x', role: null, startDate: '2018/01', endDate: '2020/01', highlights: [] },
    ]);
    expect(years).toBe(2);
  });

  it('accepts "2018-01" format', () => {
    const years = computeYears([
      { company: 'x', role: null, startDate: '2018-01', endDate: '2020-01', highlights: [] },
    ]);
    expect(years).toBe(2);
  });

  it('accepts bare year "2018" as January', () => {
    const years = computeYears([
      { company: 'x', role: null, startDate: '2018', endDate: '2020', highlights: [] },
    ]);
    expect(years).toBe(2);
  });

  it('treats 至今 as now', () => {
    const years = computeYears([
      { company: 'x', role: null, startDate: '2020.04', endDate: '至今', highlights: [] },
    ], new Date('2026-04-24'));
    expect(years).toBe(6);
  });

  it('returns null when no parseable dates', () => {
    const years = computeYears([
      { company: 'x', role: null, startDate: null, endDate: null, highlights: [] },
    ]);
    expect(years).toBeNull();
  });

  it('returns null when array empty', () => {
    expect(computeYears([])).toBeNull();
  });
});
