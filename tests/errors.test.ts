// tests/errors.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ExtractionError, toUserMessage } from '@/lib/errors';

describe('toUserMessage', () => {
  it('maps known ExtractionError codes to Chinese text', () => {
    expect(toUserMessage(new ExtractionError('pdf_parse_failed'))).toMatch(/加密|损坏/);
    expect(toUserMessage(new ExtractionError('pdf_empty'))).toMatch(/图像版|无可提取/);
    expect(toUserMessage(new ExtractionError('llm_empty'))).toMatch(/AI 服务/);
    expect(toUserMessage(new ExtractionError('llm_invalid_json'))).toMatch(/格式错误/);
  });

  it('maps zod errors to llm_schema_invalid message', () => {
    const z1 = z.object({ a: z.string() });
    let caught: unknown;
    try { z1.parse({ a: 1 }); } catch (e) { caught = e; }
    expect(toUserMessage(caught)).toMatch(/结构不完整/);
  });

  it('wraps unknown errors with generic message', () => {
    expect(toUserMessage(new Error('boom'))).toMatch(/请重新尝试/);
    expect(toUserMessage('random string')).toMatch(/请重新尝试/);
  });

  it('caps message length to 500 chars', () => {
    const long = new ExtractionError('unknown', 'x'.repeat(1000));
    const msg = toUserMessage(long);
    expect(msg.length).toBeLessThanOrEqual(500);
  });
});
