'use client';
import { useEffect, useRef, useState } from 'react';
import { parse as bestEffort } from 'best-effort-json-parser';
import type { Candidate } from '@/lib/db/schema';
import type { ExtractedResume } from '@/lib/validation';

export type StreamingResume = Partial<{
  basic:      Partial<ExtractedResume['basic']>;
  targetRole: string | null;
  educations: ExtractedResume['educations'];
  works:      ExtractedResume['works'];
  projects:   ExtractedResume['projects'];
  skills:     string[];
  summary:    string;
}>;

function parsePartial(buffer: string): StreamingResume {
  if (!buffer) return {};
  try {
    const obj = bestEffort(buffer);
    if (!obj || typeof obj !== 'object') return {};
    return obj as StreamingResume;
  } catch {
    return {};
  }
}

export function useCandidateStream(initial: Candidate): {
  streaming: StreamingResume | null;
  final: Candidate;
  error: string | null;
  autoMatchFailed: boolean;
} {
  const [final, setFinal] = useState<Candidate>(initial);
  const [streaming, setStreaming] = useState<StreamingResume | null>(
    initial.extractionStatus === 'parsed' || initial.extractionStatus === 'error'
      ? null
      : {}
  );
  const [error, setError] = useState<string | null>(
    initial.extractionStatus === 'error' ? initial.extractionError ?? '未知错误' : null
  );
  const [autoMatchFailed, setAutoMatchFailed] = useState(false);
  const bufferRef          = useRef<string>('');
  const pendingBufferRef   = useRef<string>('');
  const debounceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (final.extractionStatus === 'parsed' || final.extractionStatus === 'error') return;

    bufferRef.current = '';
    const es = new EventSource(`/api/candidates/${final.id}/stream`);

    const onSnapshot = (e: MessageEvent) => {
      try {
        const { buffer } = JSON.parse(e.data);
        bufferRef.current = buffer ?? '';
        setStreaming(parsePartial(bufferRef.current));
      } catch { /* ignore */ }
    };
    const onChunk = (e: MessageEvent) => {
      try {
        const { text } = JSON.parse(e.data);
        bufferRef.current += text;
        pendingBufferRef.current = bufferRef.current;
        if (debounceTimerRef.current !== null) return;
        debounceTimerRef.current = setTimeout(() => {
          debounceTimerRef.current = null;
          setStreaming(parsePartial(pendingBufferRef.current));
        }, 80);
      } catch { /* ignore */ }
    };
    const onDone = (e: MessageEvent) => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      try {
        const data = JSON.parse(e.data);
        setFinal(data.candidate);
        if (data.autoMatchFailed) setAutoMatchFailed(true);
        setStreaming(null);
      } catch { /* ignore */ }
      es.close();
    };
    const onServerError = (e: MessageEvent) => {
      const data = (e as any).data;
      if (typeof data === 'string' && data.length > 0) {
        try {
          const { message } = JSON.parse(data);
          setError(message);
          setStreaming(null);
          es.close();
        } catch { /* malformed; keep streaming */ }
      }
      // 无 data 的网络 error:交给浏览器自动重连
    };

    es.addEventListener('snapshot', onSnapshot as EventListener);
    es.addEventListener('chunk',    onChunk    as EventListener);
    es.addEventListener('done',     onDone     as EventListener);
    es.addEventListener('error',    onServerError as EventListener);

    return () => {
      es.close();
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [final.id, final.extractionStatus]);

  return { streaming, final, error, autoMatchFailed };
}
