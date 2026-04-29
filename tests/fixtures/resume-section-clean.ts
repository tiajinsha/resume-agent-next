// tests/fixtures/resume-section-clean.ts
// 模拟 LLM 对"工作经历表格 + 项目经历独立段"的简历的抽取输出
import type { ExtractedResume } from '@/lib/validation';

export const RESUME_SECTION_CLEAN: ExtractedResume = {
  basic: {
    name:  '田金沙',
    email: '754671297@qq.com',
    phone: '19973361472',
    city:  '重庆',
    age:   28,
  },
  targetRole: '前端开发工程师 / TypeScript 全栈开发',
  educations: [
    {
      school:     '重庆航天',
      major:      '软件工程',
      degree:     null,
      startDate:  '2016/06',
      endDate:    '2019/07',
      schoolTier: null,
    },
  ],
  works: [
    { company: '开林企业管理', role: '前端开发工程师', startDate: '2023/03', endDate: '2026/02', description: null, highlights: [] },
    { company: '誉存科技',     role: '前端开发工程师', startDate: '2021/01', endDate: '2022/12', description: null, highlights: [] },
    { company: '微创软件',     role: '前端开发工程师', startDate: '2019/10', endDate: '2020/11', description: null, highlights: [] },
  ],
  projects: [
    {
      name:        '建管家大数据查询平台',
      url:         'https://cha.jiangongdata.com',
      role:        null,
      techStack:   ['Vue3', 'Nuxt.js', 'Element UI'],
      startDate:   null,
      endDate:     null,
      description: '全国建筑行业大数据服务平台,提供招标 / 中标 / 企业 / 资质 / 证书一站式查询服务',
      highlights: [
        '基于 Vue Hooks 封装大量业务通用钩子(请求、缓存、弹窗、列表、筛选等)',
        '自研高性能表格体系,支持虚拟滚动、树形展开、排序、分页',
        'Gzip + Brotli 双算法预压缩,优先级 br > gzip,阈值 10KB',
      ],
    },
    {
      name:        'JKVideo',
      url:         'https://github.com/tiajinsha/JKVideo',
      role:        '独立开发',
      techStack:   ['React Native', 'TypeScript', 'Expo', 'DASH'],
      startDate:   null,
      endDate:     null,
      description: '独立开发的第三方网络视频客户端,Android / iOS / Web 三端一套代码运行',
      highlights: [
        'DASH 流媒体播放引擎,支持 4K / HDR / 杜比、清晰度切换、秒开优化',
        'Zustand 多模块状态管理:auth / download / video / live / settings 分域隔离',
        'Sentry 错误追踪 + Web Shim 隔离',
      ],
    },
  ],
  skills: ['Vue3', 'React', 'React Native', 'TypeScript', 'Nuxt.js', 'Next.js', 'Node.js', 'NestJS'],
  summary: '5 年前端开发经验,专注中大型 Web 应用与跨端工程化,具备从 0 到 1 的架构设计与独立交付能力。',
};
