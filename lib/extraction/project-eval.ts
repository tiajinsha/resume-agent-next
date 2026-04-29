// lib/extraction/project-eval.ts
import OpenAI from 'openai';
import { ProjectEvalResponse } from '../validation';
import type { ExtractedResume } from '../validation';

type Project = NonNullable<ExtractedResume['projects']>[number];

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
      timeout: 60_000,
    });
  }
  return _client;
}

const SYSTEM_PROMPT = `你是一名资深技术面试官，负责评估候选人项目经历的含金量。

对输入的每个项目给出：
- aiSummary：1–2 句综合评价，必须引用具体技术名称、指标或成果，不写"功能完善"等空洞表达
- valueTag：仅对有明显亮点的项目打 Tag，最多给 1/3 的项目打（若只有 1 个项目可酌情打）
  - "亮点项目"：技术复杂度高，或有明确规模指标/业务成果
  - "独立完成"：候选人独立负责或主导开发，且项目有一定技术含量
  - "规模化应用"：明确提到用户量、DAU、数据量或高并发等可量化规模
  - 不满足以上任何一项，返回 null

返回 JSON，格式为外层对象包含 results 数组，长度与输入项目数相同，索引对应：
{"results": [{"aiSummary": "...", "valueTag": "亮点项目或null"}, ...]}
只返回 JSON，不要 markdown 代码块，不要任何说明文字。`;

export async function evalProjects(
  projects: Project[],
): Promise<{ aiSummary: string; valueTag: string | null }[]> {
  if (projects.length === 0) return [];
  if (process.env.LLM_STUB === '1') {
    return projects.map((_, i) => ({
      aiSummary: `项目 ${i + 1} 技术评估（stub）`,
      valueTag: i === 0 ? '亮点项目' : null,
    }));
  }

  const projectsText = projects.map((p, i) =>
    `[${i}] ${p.name}
角色：${p.role ?? '未注明'}
技术栈：${p.techStack.join('、') || '无'}
描述：${p.description ?? '无'}
亮点：${p.highlights.slice(0, 4).join('；') || '无'}`
  ).join('\n\n');

  const resp = await client().chat.completions.create({
    model: 'deepseek-chat',
    temperature: 0,
    stream: false,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: projectsText },
    ],
  });

  const raw = JSON.parse(resp.choices[0]?.message?.content ?? '{}');
  const arr: unknown = raw.results;
  if (!Array.isArray(arr)) throw new Error(`unexpected eval format: ${JSON.stringify(raw).slice(0, 200)}`);

  return ProjectEvalResponse.parse(arr);
}
