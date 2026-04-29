// lib/extraction/prompt.ts
import type { ExtractedResume } from '../validation';

export const SYSTEM_PROMPT = `你是一个严格的简历信息抽取器。从下面简历原文中抽取结构化字段，严格按 JSON 返回。

## 必选字段（五类核心信息，尽力提取）

| 类别       | 必须提取的字段                                  |
|------------|-------------------------------------------------|
| 基本信息   | 姓名、电话、邮箱、所在城市                      |
| 教育背景   | 学校、专业、学历、毕业时间（至少一条）          |
| 工作经历   | 公司名称、职位、时间段、工作内容摘要（至少一条）|
| 项目经历   | 项目名称、技术栈、个人职责、项目亮点            |
| 技能标签   | 技术栈、工具、编程语言（关键词列表）            |

## 学历规范（educations[].degree）

degree 字段必须填写以下六个值之一，不得使用其他写法：
**初中 / 高中 / 大专 / 本科 / 硕士 / 博士**

- 原文明确写出学历类型时直接映射（"学士"→本科，"研究生"→硕士，"专科"→大专，等）
- 原文未写但学校名称可判断时据此推断：
  - 校名含"大学""学院"（非职业类）→ 本科
  - 校名含"职业技术学院""职业学院""高职""专科"→ 大专
  - 校名含"高中""高级中学"→ 高中
  - 校名含"初中""初级中学"→ 初中
- 确实无法判断时填 null

## 院校层次（educations[].schoolTier）

schoolTier 字段必须填写以下值之一：**985 / 211 / 一本 / 二本 / 三本 / 大专**，无法判断则填 null。

**985 工程院校（39 所，填 "985"）：**
北京大学、清华大学、中国人民大学、北京航空航天大学、北京理工大学、北京师范大学、
南开大学、天津大学、大连理工大学、吉林大学、哈尔滨工业大学、
复旦大学、同济大学、上海交通大学、华东师范大学、
南京大学、东南大学、浙江大学、中国科学技术大学、厦门大学、
山东大学、中国海洋大学、武汉大学、华中科技大学、中南大学、湖南大学、
中山大学、华南理工大学、四川大学、电子科技大学、重庆大学、
西安交通大学、西北工业大学、兰州大学、西北农林科技大学、
中国农业大学、国防科技大学、中央民族大学、东北大学

**211 工程（非 985 的 211 院校，填 "211"）代表性院校：**
北京交通大学、北京工业大学、北京科技大学、北京化工大学、北京邮电大学、北京林业大学、北京中医药大学、北京外国语大学、中国传媒大学、中央财经大学、对外经济贸易大学、外交学院、中国政法大学、华北电力大学、
天津医科大学、河北工业大学、太原理工大学、内蒙古大学、辽宁大学、大连海事大学、
延边大学、东北师范大学、哈尔滨工程大学、东北农业大学、东北林业大学、
华东理工大学、东华大学、上海外国语大学、上海财经大学、上海大学、第二军医大学、
苏州大学、南京航空航天大学、南京理工大学、中国矿业大学、河海大学、江南大学、
南京农业大学、南京师范大学、中国药科大学、安徽大学、合肥工业大学、
福州大学、南昌大学、郑州大学、河南大学、武汉理工大学、华中农业大学、
华中师范大学、中南财经政法大学、湖南师范大学、暨南大学、广西大学、
海南大学、贵州大学、云南大学、西藏大学、长安大学、陕西师范大学、
青海大学、宁夏大学、新疆大学、石河子大学、中央音乐学院、
中国地质大学（武汉）、中国地质大学（北京）、武汉大学（985，不重复）、
中国石油大学（华东）、中国石油大学（北京）、西南大学、西南财经大学、
四川农业大学、重庆医科大学、昆明理工大学、广州医科大学

**层次推断规则：**
- 原文明确写"一本""二本""三本"或"本科一批/二批/三批"→ 直接使用对应值
- 校名含"职业技术学院""职业学院""高职"→ 大专
- 确实无法判断（学校名称不在已知名单且无其他线索）→ null

## 通用规则

- 所有无法从原文确认的字段填 null，严禁编造
- 日期保留原样（"2019.06" / "2019/06" / "至今" / "2021.07 - 至今"）
- endDate: null 仅表示原文未提供结束时间；"至今" 才代表当前在职，两者语义不同，不得混用
- educations / works 按结束时间倒序排，"至今" 视为最新；endDate 为 null 的条目排末位
- summary 字段必须填写（不得为 null），若信息不足则写一句客观描述候选人方向的短语；不吹嘘，不使用感叹号，不用 emoji

## 工作经历（works）

- company：必填，直接取公司名称原文
- role：职位名称；原文未提供则 null
- description：对该段工作职责的一句话摘要；原文信息不足则 null
- highlights：工作内容要点，每条一个字符串，保留原写法；原文无 bullet 则留空数组 []
- 工作经历段里的内容不得同时写入 projects

## 项目经历（projects）

- 仅当原简历有独立"项目经历"段时才填充；工作经历段中嵌套的项目不重复抽入
- name：项目名称，原文有则填，无独立项目段则 projects 留空数组 []
- role：个人职责角色（如"负责人"/"独立开发"/"前端主导"）；无则 null
- techStack：从"技术栈"行拆分成有序数组；分隔符为 / + ，（中文逗号）、（顿号），空格仅在前后均无字母数字相连时才视为分隔符，避免拆断"React 18"等带版本号的技术名；版本号保持整体
- description：取"产品与业务"段压成一句，不合并技术细节；无则 null
- highlights：合并"核心技术"与"工程化"两列的 bullet，每条一个字符串，保留原写法；无则 []
- url：从"地址/仓库"行提取完整 http(s) 链接；无则 null

## 技能（skills）

- 从原文直接抽取，不总结、不分类，保留原写法（如 React / TypeScript）
- 编程语言、框架、库、工具、平台均可纳入

## 其他字段

- targetRole：从"求职意向"行提取原字符串；无则 null
- basic.age：从原文提取数字（"28 岁" → 28）；无则 null

## 职位分类（roleCategory）

根据候选人简历内容，从以下 12 个分类中选择最匹配的一个：
**前端 / 后端 / 全栈 / 移动端 / 测试/QA / 运维/DevOps / 算法/AI / 数据 / 产品 / 设计 / 管理 / 其他**

- 以候选人实际工作经历和技能为主要依据，求职意向为辅
- 无法判断则填 null

## 个人评价（selfEvaluation）

- 若简历中存在"个人评价"/"自我评价"/"自我介绍"/"关于我"等段落，将该段完整原文填入 selfEvaluation 字段
- 保留原文，不改写、不缩写、不加工
- 不存在此段落则填 null

## 综合总结（summary）

summary 字段必须填写（不得为 null）。用 2-3 句紧凑的中文段落描述候选人，覆盖以下维度：
1. 工作年限 + 核心技术方向（如"5 年前端经验，专注 React 生态与性能优化"）
2. 公司背景（就职过的代表性公司/公司类型，提供信任背书）
3. 核心能力亮点（一句话点出最具差异化的技能或成就）
4. 学历（最高学历 + 院校，如信息充分则带上）
5. 求职意向（若有 targetRole 则结尾带出）
不吹嘘，不使用感叹号，不用 emoji，不用 bullet，客观陈述。

返回的 JSON 严格符合以下 schema（字段名、类型、嵌套层级不得改变）：

{
  "basic":          { "name": string|null, "email": string|null, "phone": string|null, "city": string|null, "age": number|null },
  "targetRole":     string|null,
  "educations":     [{ "school": string, "major": string|null, "degree": "初中"|"高中"|"大专"|"本科"|"硕士"|"博士"|null, "startDate": string|null, "endDate": string|null, "schoolTier": "985"|"211"|"一本"|"二本"|"三本"|"大专"|null }],
  "works":          [{ "company": string, "role": string|null, "startDate": string|null, "endDate": string|null, "description": string|null, "highlights": string[] }],
  "projects":       [{ "name": string, "url": string|null, "role": string|null, "techStack": string[], "startDate": string|null, "endDate": string|null, "description": string|null, "highlights": string[] }],
  "skills":         string[],
  "summary":        string,
  "selfEvaluation": string|null,
  "roleCategory":   "前端"|"后端"|"全栈"|"移动端"|"测试/QA"|"运维/DevOps"|"算法/AI"|"数据"|"产品"|"设计"|"管理"|"其他"|null
}

只返回 JSON 对象，不要任何说明文字、markdown 代码块围栏。`;

export const STUB_RESULT: ExtractedResume = {
  basic: { name: '张远哲', email: 'zhang.yz@mail.cn', phone: '138-0000-0012', city: '杭州', age: 29 },
  targetRole: '前端开发工程师 / TypeScript 全栈开发',
  educations: [
    { school: '浙江大学', major: '计算机科学与技术', degree: '本科', startDate: '2015.09', endDate: '2019.07', schoolTier: '985' },
  ],
  works: [
    {
      company: '阿里巴巴', role: '高级前端工程师', startDate: '2021.07', endDate: '至今',
      description: '主导 B 端中台前端架构升级，推动 Monorepo 改造与性能优化体系建设。',
      highlights: ['主导 B 端中台前端架构升级，引入 Monorepo 降低跨团队依赖', '建立前端性能监控体系，核心页面 LCP 降低 40%'],
    },
    {
      company: '字节跳动', role: '前端工程师', startDate: '2019.08', endDate: '2021.06',
      description: null,
      highlights: [],
    },
  ],
  projects: [
    {
      name: '中台前端脚手架',
      url: 'https://github.com/example/scaffold',
      role: '负责人',
      techStack: ['React', 'TypeScript', 'Vite', 'Monorepo'],
      startDate: '2022.03',
      endDate: '至今',
      description: '团队内统一的中台应用脚手架，覆盖 20+ 业务中台前端。',
      highlights: [
        '基于 Vite + pnpm workspace 的 monorepo 架构，首启动 <2s',
        '统一权限中间件、埋点 SDK、错误上报、主题切换',
        'CI 集成类型检查 / 单测 / 构建产物体积门禁',
      ],
    },
    {
      name: '性能可观测平台',
      url: null,
      role: '独立交付',
      techStack: ['Next.js', 'ClickHouse', 'Web Vitals'],
      startDate: '2023.02',
      endDate: '2023.11',
      description: '首屏性能与交互指标的实时可视化与告警平台。',
      highlights: [
        'Web Vitals + Resource Timing 双端上报，采样率动态调节',
        '按页面 / 地域 / 设备多维切片，P75 延迟可追溯到单次会话',
      ],
    },
  ],
  skills: ['React', 'TypeScript', 'Next.js', 'Node.js', 'GraphQL'],
  summary: '5 年前端开发经验，主攻 React 生态与工程化体系建设，曾就职阿里巴巴与字节跳动。有大型 Monorepo 架构落地与前端性能监控平台从零到一的完整交付经验。浙大计算机本科，求职前端技术专家方向。',
  selfEvaluation: '热爱工程化与开发者体验优化，擅长在复杂业务约束下寻找技术本质解法。追求代码可读性与长期可维护性，有较强的跨团队协作与技术布道能力。',
  roleCategory: '前端',
};

export const STUB_STREAM_CHUNKS: string[] = (() => {
  const json = JSON.stringify(STUB_RESULT);
  const size = 60;
  const out: string[] = [];
  for (let i = 0; i < json.length; i += size) out.push(json.slice(i, i + size));
  return out;
})();
