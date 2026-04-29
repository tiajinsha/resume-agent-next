// components/UploadClient.tsx
'use client';
import React, { useRef, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import pLimit from 'p-limit';
import { Sidebar, TopBar, Btn, Badge, Card } from './ui';
import { I } from './icons';
import { useJobPoll } from '@/hooks/useJobPoll';

type UploadStatus = 'queued' | 'uploading' | 'uploaded' | 'extracting' | 'parsed' | 'error';

type UploadItem = {
  key: string;
  file: File;
  id?: string;
  status: UploadStatus;
  progress: number;
  error?: string;
};

const STATUS_META: Record<UploadStatus, { label: string; tone: 'neutral' | 'info' | 'accent' | 'success' | 'danger' }> = {
  queued:     { label: '排队中',    tone: 'neutral' },
  uploading:  { label: '上传中',    tone: 'info' },
  uploaded:   { label: '等待解析',  tone: 'neutral' },
  extracting: { label: 'AI 解析中', tone: 'accent' },
  parsed:     { label: '已完成',    tone: 'success' },
  error:      { label: '解析失败',  tone: 'danger' },
};

const limiter = pLimit(5);

import type { User } from '@/lib/db/schema';

export default function UploadClient({ user }: { user: User }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pollIds = useMemo(
    () =>
      items
        .filter((it) => it.id && (it.status === 'uploaded' || it.status === 'extracting'))
        .map((it) => it.id!),
    [items]
  );
  const polled = useJobPoll(pollIds, pollIds.length > 0);

  useEffect(() => {
    setItems((prev) =>
      prev.map((it) => {
        if (!it.id || !polled[it.id]) return it;
        const s = polled[it.id];
        if (s.extractionStatus === it.status) return it;
        return {
          ...it,
          status: s.extractionStatus as UploadStatus,
          error: s.extractionError ?? undefined,
        };
      })
    );
  }, [polled]);

  const kpi = useMemo(() => ({
    total: items.length,
    parsed: items.filter(i => i.status === 'parsed').length,
    active: items.filter(i => i.status === 'extracting' || i.status === 'uploaded' || i.status === 'uploading' || i.status === 'queued').length,
    error: items.filter(i => i.status === 'error').length,
  }), [items]);

  function onPick(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    const existing = items.length;
    if (existing + arr.length > 20) {
      alert(`一次最多 20 份,已阻止第 ${20 - existing + 1} 份起`);
      arr.splice(20 - existing);
    }
    const newItems: UploadItem[] = arr.map((f) => ({
      key: `${Date.now()}-${Math.random()}`,
      file: f,
      status: 'queued',
      progress: 0,
    }));
    setItems((prev) => [...prev, ...newItems]);
    newItems.forEach((it) => limiter(() => uploadOne(it)));
  }

  function uploadOne(item: UploadItem): Promise<void> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        setItems((prev) =>
          prev.map((i) =>
            i.key === item.key
              ? { ...i, status: 'uploading', progress: Math.round((e.loaded / e.total) * 100) }
              : i
          )
        );
      };
      xhr.onload = () => {
        if (xhr.status === 200) {
          const body = JSON.parse(xhr.responseText);
          setItems((prev) =>
            prev.map((i) =>
              i.key === item.key ? { ...i, id: body.id, status: 'uploaded', progress: 100 } : i
            )
          );
        } else {
          setItems((prev) =>
            prev.map((i) =>
              i.key === item.key ? { ...i, status: 'error', error: `上传失败 (HTTP ${xhr.status})` } : i
            )
          );
        }
        resolve();
      };
      xhr.onerror = () => {
        setItems((prev) =>
          prev.map((i) => (i.key === item.key ? { ...i, status: 'error', error: '网络错误' } : i))
        );
        resolve();
      };
      const form = new FormData();
      form.append('file', item.file);
      xhr.send(form);
    });
  }

  async function retry(item: UploadItem) {
    if (!item.id) return;
    const r = await fetch(`/api/candidates/${item.id}/retry`, { method: 'POST' });
    if (r.ok) {
      setItems((prev) =>
        prev.map((i) =>
          i.key === item.key ? { ...i, status: 'uploaded', error: undefined } : i
        )
      );
    }
  }

  function clearDone() {
    setItems((prev) => prev.filter(i => i.status !== 'parsed'));
  }

  const KpiCard = ({ label, value, sub }: { label: string; value: number | string; sub?: string }) => (
    <Card style={{ padding: '16px 20px', flex: 1 }}>
      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color: 'var(--fg)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 6 }}>{sub}</div>}
    </Card>
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 44px)', background: 'var(--bg-sunken)' }}>
      <Sidebar active="upload" counts={{ upload: items.length }} user={user} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar title="上传与解析" subtitle="拖拽或点击上传简历,AI 自动解析提取结构化信息" />
        <div
          style={{
            padding: '24px 32px',
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            maxWidth: 1080,
            margin: '0 auto',
            width: '100%',
          }}
        >
          {/* KPI strip */}
          {items.length > 0 && (
            <div style={{ display: 'flex', gap: 12 }}>
              <KpiCard label="本次上传" value={kpi.total} sub="份简历" />
              <KpiCard label="已解析" value={kpi.parsed} sub="解析完成" />
              <KpiCard label="解析中" value={kpi.active} sub="处理中" />
              <KpiCard label="失败" value={kpi.error} sub="需重试" />
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files); }}
            style={{
              border: '2px dashed ' + (dragging ? 'var(--accent-500)' : 'var(--border-strong)'),
              background: dragging ? 'var(--accent-bg-subtle)' : 'var(--bg-elevated)',
              borderRadius: 16,
              padding: '40px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              transition: 'all var(--dur-base) var(--ease-sift)',
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: dragging ? 'var(--accent-500)' : 'var(--accent-bg-subtle)',
              color: dragging ? 'white' : 'var(--accent-500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <I.Upload size={24} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.01em' }}>
              {dragging ? '松开鼠标上传简历' : '拖拽简历到此处,或点击上传'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>
              支持批量 · 仅限 PDF · 单份最大 10MB · 最多 20 份
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Btn variant="primary" icon={<I.Upload />} onClick={() => inputRef.current?.click()}>
                选择文件
              </Btn>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                multiple
                hidden
                onChange={(e) => { onPick(e.target.files); e.target.value = ''; }}
              />
            </div>
          </div>

          {items.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>上传队列</span>
                {kpi.parsed > 0 && (
                  <Btn size="sm" onClick={clearDone}>清空已完成</Btn>
                )}
              </div>

              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {items.map((it, i) => {
                  const meta = STATUS_META[it.status];
                  return (
                    <div
                      key={it.key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0,1fr) 220px 130px 70px',
                        gap: 16,
                        padding: '14px 18px',
                        alignItems: 'center',
                        borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      {/* File name + icon */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent-bg-subtle)', color: 'var(--accent-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <I.File size={18} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {it.file.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                            {Math.round(it.file.size / 1024)} KB
                          </div>
                          {it.error && <div style={{ fontSize: 11, color: 'var(--danger-700)', marginTop: 3 }}>{it.error}</div>}
                        </div>
                      </div>

                      {/* Progress */}
                      <div>
                        {(it.status === 'uploading' || it.status === 'extracting') ? (
                          <div>
                            <div style={{ height: 4, background: 'var(--bg-sunken)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: it.progress + '%',
                                background: it.status === 'extracting' ? 'var(--accent-500)' : 'var(--info-500)',
                                borderRadius: 2,
                                transition: 'width 0.2s',
                              }} />
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                              {it.progress}%
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Status */}
                      <div>
                        <Badge tone={meta.tone} dot>{meta.label}</Badge>
                      </div>

                      {/* Action */}
                      <div>
                        {it.status === 'error' && (
                          <Btn size="sm" onClick={() => retry(it)}>重试</Btn>
                        )}
                        {it.status === 'parsed' && it.id && (
                          <Link href={`/candidates/${it.id}`} style={{ textDecoration: 'none' }}>
                            <Btn size="sm" icon={<I.Eye />}>查看</Btn>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
