// lib/matching/llm.ts
import OpenAI from 'openai';
import { MatchAIResponse, type MatchAIResponseData } from '../validation';
import { MATCH_SYSTEM_PROMPT, buildMatchUserMessage, STUB_MATCH_RESULT } from './prompt';
import type { JobDescription, Candidate } from '../db/schema';

const USE_STUB = process.env.LLM_STUB === '1';

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

export async function callMatchAI(
  jd: JobDescription,
  candidate: Candidate,
): Promise<MatchAIResponseData> {
  if (USE_STUB) return STUB_MATCH_RESULT;

  const userMsg = buildMatchUserMessage(jd, candidate);

  const resp = await client().chat.completions.create({
    model: 'deepseek-chat',
    temperature: 0,
    stream: false,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: MATCH_SYSTEM_PROMPT },
      { role: 'user',   content: userMsg },
    ],
  });

  const raw = JSON.parse(resp.choices[0]?.message?.content ?? '{}');
  return MatchAIResponse.parse(raw);
}
