import { describe, it, expect, beforeEach } from 'vitest';
import * as bus from '@/lib/extraction/event-bus';

beforeEach(() => {
  // 模块级 Map 通过 globalThis 持有,手动清理避免跨用例污染
  delete (globalThis as any).__streamEventBus;
});

describe('event-bus', () => {
  it('subscribe returns empty buffer when no chunks yet', () => {
    const sub = bus.subscribe('id-a', () => {});
    expect(sub.buffer).toBe('');
    sub.unsubscribe();
  });

  it('publishes chunk to all subscribers', () => {
    const got1: any[] = [];
    const got2: any[] = [];
    const s1 = bus.subscribe('id-b', (e) => got1.push(e));
    const s2 = bus.subscribe('id-b', (e) => got2.push(e));

    bus.publish('id-b', { type: 'chunk', text: 'hello' });

    expect(got1).toHaveLength(1);
    expect(got2).toHaveLength(1);
    expect(got1[0]).toEqual({ type: 'chunk', text: 'hello' });
    s1.unsubscribe(); s2.unsubscribe();
  });

  it('accumulates chunks into a single buffer string', () => {
    bus.publish('id-c', { type: 'chunk', text: '{"a":' });
    bus.publish('id-c', { type: 'chunk', text: '1' });
    bus.publish('id-c', { type: 'chunk', text: ',"b":2}' });

    expect(bus.getBuffer('id-c')).toBe('{"a":1,"b":2}');
  });

  it('new subscriber receives current buffer on subscribe', () => {
    bus.publish('id-d', { type: 'chunk', text: 'partial' });
    const sub = bus.subscribe('id-d', () => {});
    expect(sub.buffer).toBe('partial');
    sub.unsubscribe();
  });

  it('unsubscribe stops further events on that listener', () => {
    const got: any[] = [];
    const sub = bus.subscribe('id-e', (e) => got.push(e));
    sub.unsubscribe();
    bus.publish('id-e', { type: 'chunk', text: 'x' });
    expect(got).toHaveLength(0);
  });

  it('clear removes both buffer and emitter', () => {
    bus.publish('id-f', { type: 'chunk', text: 'x' });
    bus.clear('id-f');
    expect(bus.getBuffer('id-f')).toBe('');
  });

  it('done and error events are forwarded without touching buffer', () => {
    bus.publish('id-g', { type: 'chunk', text: 'x' });
    const got: any[] = [];
    const sub = bus.subscribe('id-g', (e) => got.push(e));
    bus.publish('id-g', { type: 'done', candidate: { id: 'id-g' } as any });
    expect(got[0].type).toBe('done');
    expect(bus.getBuffer('id-g')).toBe('x'); // buffer 仍在,直到显式 clear
    sub.unsubscribe();
    bus.clear('id-g');
  });
});
