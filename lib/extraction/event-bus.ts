// lib/extraction/event-bus.ts
import { EventEmitter } from 'node:events';
import type { Candidate } from '../db/schema';

export type StreamEvent =
  | { type: 'chunk'; text: string }
  | { type: 'done';  candidate: Candidate; autoMatchFailed?: boolean }
  | { type: 'error'; message: string };

export type Listener = (event: StreamEvent) => void;

type State = {
  emitters: Map<string, EventEmitter>;
  buffers:  Map<string, string>;
};

declare global {
  // eslint-disable-next-line no-var
  var __streamEventBus: State | undefined;
}

function state(): State {
  if (!globalThis.__streamEventBus) {
    globalThis.__streamEventBus = { emitters: new Map(), buffers: new Map() };
  }
  return globalThis.__streamEventBus;
}

function getEmitter(id: string): EventEmitter {
  const s = state();
  let e = s.emitters.get(id);
  if (!e) {
    e = new EventEmitter();
    e.setMaxListeners(0);
    s.emitters.set(id, e);
  }
  return e;
}

export function subscribe(id: string, listener: Listener): {
  buffer: string;
  unsubscribe: () => void;
} {
  const e = getEmitter(id);
  const buffer = state().buffers.get(id) ?? '';
  e.on('event', listener);
  return {
    buffer,
    unsubscribe: () => { e.off('event', listener); },
  };
}

export function publish(id: string, event: StreamEvent): void {
  if (event.type === 'chunk') {
    const s = state();
    s.buffers.set(id, (s.buffers.get(id) ?? '') + event.text);
  }
  getEmitter(id).emit('event', event);
}

export function getBuffer(id: string): string {
  return state().buffers.get(id) ?? '';
}

export function clear(id: string): void {
  const s = state();
  s.emitters.delete(id);
  s.buffers.delete(id);
}
