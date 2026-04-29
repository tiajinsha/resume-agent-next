// lib/extraction/llm.ts
import OpenAI from 'openai';
import { ExtractionError } from '../errors';
import { SYSTEM_PROMPT } from './prompt';

const USE_STUB = process.env.LLM_STUB === '1';

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
    });
  }
  return _client;
}

export async function* callDeepSeekStream(resumeText: string): AsyncIterable<string> {
  if (USE_STUB) {
    const { STUB_STREAM_CHUNKS } = await import('./prompt');
    for (const chunk of STUB_STREAM_CHUNKS) yield chunk;
    return;
  }

  try {
    const stream = await client().chat.completions.create({
      model: 'deepseek-chat',
      temperature: 0,
      stream: true,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: resumeText.slice(0, 30_000) },
      ],
    });
    for await (const part of stream) {
      const content = part.choices?.[0]?.delta?.content;
      if (content) yield content;
    }
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    const status = (err as { status?: number }).status;
    if (status) throw new ExtractionError('llm_http_error', undefined, status);
    throw new ExtractionError('unknown', String(err));
  }
}
