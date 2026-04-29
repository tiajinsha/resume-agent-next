// tests/fixtures/resume-section-embedded.ts
// 模拟 LLM 对"工作经历里嵌项目、无独立项目经历段"的简历的抽取输出
// 按规则应当:所有项目内容留在 works[].highlights,projects 为空
import type { ExtractedResume } from '@/lib/validation';

export const RESUME_SECTION_EMBEDDED: ExtractedResume = {
  basic: {
    name:  '李小明',
    email: 'liming@example.com',
    phone: '13800000000',
    city:  '北京',
    age:   null,
  },
  targetRole: null,
  educations: [
    {
      school:     '清华大学',
      major:      '计算机',
      degree:     '硕士',
      startDate:  '2018.09',
      endDate:    '2021.06',
      schoolTier: '985',
    },
  ],
  works: [
    {
      company:     '美团',
      role:        '高级前端工程师',
      startDate:   '2021.07',
      endDate:     '至今',
      description: '负责外卖 C 端首页改版与 Mini 框架重构，主导前端监控体系建设。',
      highlights: [
        '负责外卖 C 端首页改版:React + TypeScript,首屏 LCP 从 3.2s 降到 1.4s',
        '主导 Mini 框架重构:去掉老 Redux,改用 Zustand + Immer',
        '搭建前端监控体系:Sentry + 自研性能埋点',
      ],
    },
  ],
  projects: [],
  skills: ['React', 'TypeScript', 'Node.js'],
  summary: '5 年大厂前端经验,擅长 C 端性能优化与框架升级。',
};
