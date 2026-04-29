// lib/matching/prompt.ts
import type { JobDescription, Candidate } from '../db/schema';
import type { MatchAIResponseData } from '../validation';

export const MATCH_SYSTEM_PROMPT = `你是一名专业的 HR AI 助手，负责评估候选人与岗位的匹配程度。

请从以下三个维度对候选人进行打分（0–100 整数），并给出评语：
1. 技能匹配（skill）
2. 经验匹配（experience）
3. 教育背景（education）

━━ 评分细则（必须严格对照以下锚点打分）━━

【技能匹配锚点】
- 90–100：候选人技能覆盖所有必备技能，且具备多数加分技能
- 70–89：覆盖 ≥80% 必备技能，加分技能偶有涉及
- 50–69：覆盖 50–79% 必备技能，核心技能尚缺
- 20–49：覆盖 <50% 必备技能，多项核心要求缺失
- 0–19：与岗位技能几乎不匹配

【经验匹配锚点】
- 90–100：工作年限 ≥ JD 要求，行业背景与职级高度吻合
- 70–89：年限达标，方向基本吻合，偶有偏差
- 50–69：年限差距 1–2 年，或行业经验方向偏离
- 20–49：年限差距 ≥3 年，或职业方向明显不符
- 0–19：几乎无相关工作经验
- 注：若 JD 注明"不限年限"，基准给 70，依据方向契合度上下调整

【教育背景锚点】（学历级别：大专=1 / 本科=2 / 硕士=3 / 博士=4）

满足学历要求时：
- 候选人院校层次为 985 或 211（候选人信息中会标注"院校层次"字段，以该字段为准，不自行推断）：75–90
- 其他院校（一本/二本/三本/大专/未标注）：55–65（基准约 60）
- 注：若 JD 要求"不限"，按普通本科档给 55–65

不满足学历要求时（候选人学历低于 JD 要求）：
- 低 1 级：35–48
- 低 2 级及以上：15–30

━━ 硬性约束（不得违反）━━
- 教育分：满足学历要求且非名校，必须给 55–65，不得超出此范围
- 教育分：不满足学历要求，必须低于 50，不得给 50 及以上
- 教育分：院校层次为 985/211 才可给 75–90；以候选人信息中的"院校层次"字段为唯一依据，不得凭学校名称自行推断

━━ 评语规范 ━━
- comment 必须引用具体事实：技能名称、年限数字、学历名称，不得仅写"匹配良好"等空洞表达
- comment 为 1–2 句简体中文，不使用感叹号和 emoji
- summary 为 1–2 句综合评价

━━ 输出格式 ━━
综合分由系统根据 HR 设定的权重自动计算，你无需输出 overall 字段。
只返回如下 JSON，不要 markdown 代码块，不要任何说明文字：
{
  "skill":      { "score": <0-100整数>, "comment": "<评语>" },
  "experience": { "score": <0-100整数>, "comment": "<评语>" },
  "education":  { "score": <0-100整数>, "comment": "<评语>" },
  "summary":    "<1-2句综合评价>"
}`;

export function buildMatchUserMessage(jd: JobDescription, candidate: Candidate): string {
  const extracted = candidate.extractedJson;
  const works = extracted?.works ?? [];
  const worksText = works.slice(0, 3).map(w =>
    `- ${w.company}${w.role ? ` · ${w.role}` : ''}（${w.startDate ?? ''}—${w.endDate ?? ''}）` +
    (w.highlights?.length ? '\n  ' + w.highlights.slice(0, 2).join('；') : '')
  ).join('\n');

  const projects = extracted?.projects ?? [];
  const projectsText = projects.slice(0, 3).map(p =>
    `- ${p.name}（${(p.techStack ?? []).join('、')}）`
  ).join('\n');

  // 取提取时已判断的院校层次，避免匹配 AI 自行推断出错
  const schoolTier = extracted?.educations?.[0]?.schoolTier ?? null;
  const schoolTierText = schoolTier ? `（院校层次：${schoolTier}）` : '';

  return `## 岗位 JD
职位名称：${jd.title}
职位描述：${jd.description}
必备技能：${(jd.requiredSkills ?? []).join('、') || '未指定'}
加分技能：${(jd.bonusSkills ?? []).join('、') || '无'}
最低工作年限：${jd.minYears != null ? `${jd.minYears} 年` : '不限'}
学历要求：${jd.requiredDegree}

## 候选人信息
姓名：${candidate.name ?? '未知'}
工作年限：${candidate.years != null ? `${candidate.years} 年` : '未知'}
最近职位：${candidate.role ?? '未知'}${candidate.company ? ` @ ${candidate.company}` : ''}
最高学历：${candidate.degree ?? '未知'}（${candidate.school ?? ''}${candidate.major ? ` · ${candidate.major}` : ''}）${schoolTierText}
技能：${(candidate.skills ?? []).join('、') || '未知'}

工作经历：
${worksText || '无'}

项目经历：
${projectsText || '无'}

候选人画像：${candidate.summary ?? '无'}`;
}

export const STUB_MATCH_RESULT: MatchAIResponseData = {
  skill:      { score: 85, comment: '候选人具备 React、TypeScript 核心技能，覆盖岗位全部必备技能；加分项 GraphQL 亦有实践经验。' },
  experience: { score: 72, comment: '工作年限 4 年符合要求，但以 B 端中台经验为主，缺乏 ToC 产品背景。' },
  education:  { score: 80, comment: '计算机本科学历，与岗位本科及以上要求相符。' },
  summary:    '整体技能匹配度高，经验方向稍有偏差，综合评估为较优候选人。',
};
