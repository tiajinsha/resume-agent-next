// components/UploadClient.tsx
'use client';
import React, { useRef, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import pLimit from 'p-limit';
import { Upload, Progress, Button, Tag } from 'antd';
import { InboxOutlined, FileOutlined, EyeOutlined } from '@ant-design/icons';
import { Card } from './ui';
import PageLayout from './PageLayout';
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

const STATUS_META: Record<UploadStatus, { label: string; color: string }> = {
  queued:     { label: '排队中',    color: 'default' },
  uploading:  { label: '上传中',    color: 'blue' },
  uploaded:   { label: '等待解析',  color: 'default' },
  extracting: { label: 'AI 解析中', color: 'purple' },
  parsed:     { label: '已完成',    color: 'green' },
  error:      { label: '解析失败',  color: 'red' },
};

const limiter = pLimit(5);

import type { User } from '@/lib/db/schema';

export default function UploadClient({ user }: { user: User }) {
  const [items, setItems] = useState<UploadItem[]>([]);
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
    <PageLayout
      user={user}
      activeKey="/upload"
      title="上传与解析"
      subtitle="拖拽或点击上传简历，AI 自动解析提取结构化信息"
    >
      <div
        style={{
          padding: '24px 32px',
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
          <Upload.Dragger
            accept="application/pdf"
            multiple
            showUploadList={false}
            customRequest={({ file, onSuccess }) => {
              onPick((() => {
                const dt = new DataTransfer();
                dt.items.add(file as File);
                return dt.files;
              })());
              onSuccess?.({});
            }}
            style={{ borderRadius: 16 }}
          >
            <div style={{ padding: '20px 0' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'var(--accent-bg-subtle)',
                color: 'var(--accent-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <InboxOutlined style={{ fontSize: 24 }} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.01em' }}>
                拖拽简历到此处,或点击上传
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-subtle)', marginTop: 8 }}>
                支持批量 · 仅限 PDF · 单份最大 10MB · 最多 20 份
              </div>
            </div>
          </Upload.Dragger>

          {items.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>上传队列</span>
                {kpi.parsed > 0 && (
                  <Button size="small" onClick={clearDone}>清空已完成</Button>
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
                          <FileOutlined style={{ fontSize: 18 }} />
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
                          <Progress
                            percent={it.progress}
                            size="small"
                            showInfo={false}
                            strokeColor={it.status === 'extracting' ? 'var(--accent-500)' : undefined}
                          />
                        ) : null}
                      </div>

                      {/* Status */}
                      <div>
                        <Tag color={meta.color}>{meta.label}</Tag>
                      </div>

                      {/* Action */}
                      <div>
                        {it.status === 'error' && (
                          <Button size="small" onClick={() => retry(it)}>重试</Button>
                        )}
                        {it.status === 'parsed' && it.id && (
                          <Link href={`/candidates/${it.id}`} style={{ textDecoration: 'none' }}>
                            <Button size="small" icon={<EyeOutlined />}>查看</Button>
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
    </PageLayout>
  );
}
