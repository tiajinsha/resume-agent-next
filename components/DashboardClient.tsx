'use client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Table, Segmented, Button, Input, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, PlusOutlined, SortAscendingOutlined } from '@ant-design/icons';
import { Card, Avatar, SkillTag, StatusPill, ScoreRing } from './ui';
import { I } from './icons';
import PageLayout from './PageLayout';
import { useJobPoll } from '@/hooks/useJobPoll';
import { ROLE_CATEGORIES } from '@/lib/validation';
import type { Candidate, User } from '@/lib/db/schema';

const STATUS_TABS = ['全部', '待筛选', '初筛通过', '面试中', '已录用', '已淘汰'] as const;
type SortOpt = 'recent' | 'oldest' | 'name';

export default function DashboardClient({ initial, user }: { initial: Candidate[]; user: User }) {
  const router = useRouter();
  const [view, setView] = useState<'table' | 'card'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('全部');
  const [roleCategoryFilter, setRoleCategoryFilter] = useState<string>('全部');
  const [sort, setSort] = useState<SortOpt>('recent');
  const [rows, setRows] = useState(initial);

  const pendingIds = useMemo(
    () => rows.filter((r) => r.extractionStatus !== 'parsed' && r.extractionStatus !== 'error').map((r) => r.id),
    [rows]
  );
  const polled = useJobPoll(pendingIds, pendingIds.length > 0);

  useEffect(() => {
    setRows((prev) => prev.map((r) => {
      const p = polled[r.id];
      if (!p || p.extractionStatus === r.extractionStatus) return r;
      return { ...r, extractionStatus: p.extractionStatus, extractionError: p.extractionError ?? null };
    }));
  }, [polled]);

  const filtered = useMemo(() => {
    let list = rows;
    if (search) {
      const qLower = search.toLowerCase();
      list = list.filter((c) =>
        (c.name ?? '').toLowerCase().includes(qLower) ||
        (c.role ?? '').toLowerCase().includes(qLower) ||
        (c.school ?? '').toLowerCase().includes(qLower) ||
        (c.skills ?? []).some((s) => s.toLowerCase().includes(qLower))
      );
    }
    if (statusFilter !== '全部') list = list.filter((c) => c.status === statusFilter);
    if (roleCategoryFilter !== '全部') list = list.filter((c) => c.roleCategory === roleCategoryFilter);
    list = [...list].sort((a, b) => {
      if (sort === 'recent') return b.updatedAt.getTime() - a.updatedAt.getTime();
      if (sort === 'oldest') return a.updatedAt.getTime() - b.updatedAt.getTime();
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
    return list;
  }, [rows, search, statusFilter, roleCategoryFilter, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { 全部: rows.length };
    for (const s of STATUS_TABS.slice(1)) c[s] = rows.filter((x) => x.status === s).length;
    return c;
  }, [rows]);

  const roleCategoryCounts = useMemo(() => {
    const c: Record<string, number> = { 全部: rows.length };
    for (const cat of ROLE_CATEGORIES) c[cat] = rows.filter((x) => x.roleCategory === cat).length;
    return c;
  }, [rows]);

  const kpi = useMemo(() => ({
    total: rows.length,
    pending: rows.filter(r => r.status === '待筛选').length,
    interview: rows.filter(r => r.status === '面试中').length,
    hired: rows.filter(r => r.status === '已录用').length,
  }), [rows]);

  const KpiCard = ({ label, value, sub }: { label: string; value: number | string; sub?: string }) => (
    <Card style={{ padding: '16px 20px', flex: 1 }}>
      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color: 'var(--fg)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 6 }}>{sub}</div>}
    </Card>
  );

  const columns: ColumnsType<Candidate> = [
    {
      title: '候选人',
      key: 'name',
      render: (_, c) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={c.name ?? '?'} size={32} />
          <div>
            <div style={{ fontWeight: 500, color: 'var(--fg)' }}>{c.name ?? '(未提取)'}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>{c.city ?? ''}{c.email ? ` · ${c.email}` : ''}</div>
          </div>
        </div>
      ),
    },
    {
      title: '目标岗位',
      key: 'role',
      render: (_, c) => <span style={{ color: 'var(--fg)' }}>{c.role ?? '—'}</span>,
    },
    {
      title: '技能',
      key: 'skills',
      render: (_, c) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 180 }}>
          {(c.skills ?? []).slice(0, 3).map((s) => <SkillTag key={s}>{s}</SkillTag>)}
          {(c.skills?.length ?? 0) > 3 && <span style={{ fontSize: 11, color: 'var(--fg-subtle)', alignSelf: 'center' }}>+{(c.skills?.length ?? 0) - 3}</span>}
        </div>
      ),
    },
    {
      title: '学校',
      key: 'school',
      render: (_, c) => <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>{c.school ?? '—'}</span>,
    },
    {
      title: '状态',
      key: 'status',
      render: (_, c) => (
        c.extractionStatus === 'parsed' ? <StatusPill status={c.status} /> :
        c.extractionStatus === 'error' ? <span style={{ fontSize: 12, color: 'var(--danger-700)' }}>解析失败</span> :
        <span style={{ fontSize: 12, color: 'var(--accent-700)' }}>{c.extractionStatus === 'extracting' ? 'AI 解析中' : '等待解析'}</span>
      ),
    },
    {
      title: '匹配',
      key: 'match',
      render: (_, c) => <ScoreRing score={(c.matchResults ?? []).reduce((m, r) => Math.max(m, r.overall), 0)} size={36} />,
    },
    {
      title: '更新',
      key: 'updatedAt',
      render: (_, c) => <span style={{ fontSize: 12, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>{c.updatedAt.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>,
    },
    {
      title: '',
      key: 'arrow',
      width: 40,
      render: () => <I.ChevR size={14} style={{ color: 'var(--fg-subtle)' }} />,
    },
  ];

  const statusSegmentedOptions = STATUS_TABS.map(s => ({
    label: `${s} ${counts[s] ?? 0}`,
    value: s,
  }));

  const roleSegmentedOptions = ['全部' as const, ...ROLE_CATEGORIES].map(cat => ({
    label: `${cat} ${roleCategoryCounts[cat] ?? 0}`,
    value: cat,
  }));

  return (
    <PageLayout
      user={user}
      activeKey="/dashboard"
      title="候选人"
      subtitle={`共 ${rows.length} 位候选人`}
      headerRight={
        <Space>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索姓名、技能、学校…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <Button type="primary" size="small" icon={<PlusOutlined />}>上传简历</Button>
          </Link>
        </Space>
      }
    >
      <div style={{ padding: '20px 24px' }}>
          {/* KPI strip */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <KpiCard label="全部候选人" value={kpi.total} sub="已录入系统" />
            <KpiCard label="待筛选" value={kpi.pending} sub="等待初筛" />
            <KpiCard label="面试中" value={kpi.interview} sub="进入面试阶段" />
            <KpiCard label="已录用" value={kpi.hired} sub="完成录用" />
          </div>

          {/* Status filter + view toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <Segmented
              options={statusSegmentedOptions}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as string)}
            />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button
                icon={<SortAscendingOutlined />}
                onClick={() => setSort(sort === 'recent' ? 'oldest' : sort === 'oldest' ? 'name' : 'recent')}
              >
                {sort === 'recent' ? '最近解析' : sort === 'oldest' ? '最早解析' : '姓名 A→Z'}
              </Button>
              <Segmented
                options={[
                  { value: 'table', icon: <I.List size={16} /> },
                  { value: 'card', icon: <I.Grid size={16} /> },
                ]}
                value={view}
                onChange={(v) => setView(v as 'table' | 'card')}
              />
            </div>
          </div>

          {/* Role category filter */}
          <div style={{ marginBottom: 16, overflowX: 'auto' }}>
            <Segmented
              options={roleSegmentedOptions}
              value={roleCategoryFilter}
              onChange={(v) => setRoleCategoryFilter(v as string)}
            />
          </div>

          {view === 'table' ? (
            <Table
              dataSource={filtered}
              columns={columns}
              rowKey="id"
              pagination={false}
              onRow={(c) => ({ onClick: () => router.push(`/candidates/${c.id}`), style: { cursor: 'pointer' } })}
              locale={{ emptyText: (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-subtle)' }}>
                  还没有候选人。前往<Link href="/upload" style={{ color: 'var(--accent)', textDecoration: 'none', margin: '0 4px' }}>上传</Link>开始。
                </div>
              )}}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {filtered.map((c) => (
                <Link key={c.id} href={`/candidates/${c.id}`} style={{ textDecoration: 'none' }}>
                  <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <Avatar name={c.name ?? '?'} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{c.name ?? '(未提取)'}</div>
                        <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 2 }}>{c.role ?? '—'}</div>
                      </div>
                      <ScoreRing score={(c.matchResults ?? []).reduce((m, r) => Math.max(m, r.overall), 0)} size={40} />
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(c.skills ?? []).slice(0, 4).map((s) => <SkillTag key={s}>{s}</SkillTag>)}
                    </div>
                    <div style={{ paddingTop: 10, borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                      {c.extractionStatus === 'parsed' ? <StatusPill status={c.status} /> : <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>{c.extractionStatus === 'extracting' ? 'AI 解析中' : '等待解析'}</span>}
                    </div>
                  </Card>
                </Link>
              ))}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1/-1', padding: 60, textAlign: 'center', color: 'var(--fg-subtle)' }}>
                  还没有候选人。前往<Link href="/upload" style={{ color: 'var(--accent)', textDecoration: 'none', margin: '0 4px' }}>上传</Link>开始。
                </div>
              )}
            </div>
          )}
      </div>
    </PageLayout>
  );
}
