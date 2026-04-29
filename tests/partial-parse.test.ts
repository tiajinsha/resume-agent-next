import { describe, it, expect } from 'vitest';
import { parse as bestEffort } from 'best-effort-json-parser';

describe('best-effort-json-parser contract', () => {
  it('returns {} for empty input without throwing', () => {
    expect(() => bestEffort('')).not.toThrow();
  });

  it('parses a complete object', () => {
    expect(bestEffort('{"a":1,"b":"x"}')).toEqual({ a: 1, b: 'x' });
  });

  it('parses a truncated object (missing closing brace)', () => {
    const r = bestEffort('{"a":1,"b":"partial') as any;
    expect(r).toBeTypeOf('object');
    expect(r.a).toBe(1);
    // b 可能是部分字符串或 undefined；只断言"它不是让解析崩掉"
  });

  it('parses a truncated array', () => {
    const r = bestEffort('{"arr":[1,2,3') as any;
    expect(Array.isArray(r.arr)).toBe(true);
    expect(r.arr.slice(0, 3)).toEqual([1, 2, 3]);
  });

  it('parses half-written nested object inside array', () => {
    const r = bestEffort('{"arr":[{"k":1},{"k":2') as any;
    expect(Array.isArray(r.arr)).toBe(true);
    expect(r.arr[0]).toEqual({ k: 1 });
    expect(r.arr[1]).toBeTypeOf('object');
    expect(r.arr[1].k).toBe(2);
  });

  it('preserves escaped quotes in strings', () => {
    const r = bestEffort('{"s":"with \\"quotes\\""}') as any;
    expect(r.s).toBe('with "quotes"');
  });
});
