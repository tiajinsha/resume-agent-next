'use client';
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Table, Segmented, Button, Input, Space, Select, Modal, message, Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, SortAscendingOutlined, SyncOutlined } from '@ant-design/icons';
import { Card, Avatar, SkillTag, StatusPill, ScoreRing } from './ui';
import { I } from './icons';
import PageLayout from './PageLayout';
import { useJobPoll } from '@/hooks/useJobPoll';
import { ROLE_CATEGORIES } from '@/lib/validation';
import type { Candidate, User, CandidateStatus } from '@/lib/db/schema';
import { CANDIDATE_STATUS } from '@/lib/db/schema';

// ─── Utility functions ──────────────────────────────────────────────────────

function highlight(text: string | null | undefined, query: string): React.ReactNode {
  if (!text) return text ?? '';
  const q = query.trim().toLowerCase();
  if (!q) return text;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let last = 0;
  let idx = lower.indexOf(q);
  while (idx !== -1) {
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push(
      <mark key={idx} style={{ background: 'var(--accent-bg-subtle)', color: 'var(--accent-700)', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    last = idx + q.length;
    idx = lower.indexOf(q, last);
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function bestScore(c: Candidate): number {
  return Math.max(0, ...(c.matchResults ?? []).map((r) => r.overall));
}

function downloadCSV(rows: Candidate[]): void {
  const header = ['姓名', '职位', '年限', '学历', '院校', '城市', '状态', '最高匹配分'];
  const lines = rows.map((c) =>
    [
      c.name ?? '',
      c.role ?? '',
      c.years != null ? String(c.years) : '',
      c.degree ?? '',
      c.school ?? '',
      c.city ?? '',
      c.status,
      String(bestScore(c)),
    ]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv = '\uFEFF' + [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'candidates.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── KPI Card (defined outside to avoid useState re-mount on every render) ──

type KpiCardProps = {
  label: string;
  value: number;
  sub?: string;
  filterStatus: string;     // which status this card maps to
  activeFilter: string;     // current statusFilter value
  onFilter: (s: string) => void;
};

const KpiCard = ({ label, value, sub, filterStatus, activeFilter, onFilter }: KpiCardProps) => {
  const [hovered, setHovered] = useState(false);
  const isActive = filterStatus === activeFilter;

  function handleClick() {
    if (filterStatus === '全部') {
      onFilter('全部');
    } else {
      onFilter(activeFilter === filterStatus ? '全部' : filterStatus);
    }
  }

  return (
    <Card
      style={{
        padding: '16px 20px',
        flex: 1,
        cursor: 'pointer',
        border: isActive ? '2px solid var(--accent-500)' : '2px solid transparent',
        background: isActive ? 'var(--accent-bg-subtle)' : undefined,
        transform: hovered ? 'translateY(-2px)' : undefined,
        boxShadow: hovered ? 'var(--shadow-1)' : undefined,
        transition: 'transform var(--dur-base) ease, box-shadow var(--dur-base) ease, background var(--dur-base) ease, border-color var(--dur-base) ease',
      }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ fontSize: 11, color: isActive ? 'var(--accent-700)' : 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--fg)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 6 }}>{sub}</div>}
    </Card>
  );
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_TABS = ['全部', '待筛选', '初筛通过', '面试中', '已录用', '已淘汰'] as const;
type SortOpt = 'recent' | 'oldest' | 'name' | 'score';
const SORT_OPTS: SortOpt[] = ['recent', 'oldest', 'name', 'score'];
const SORT_LABELS: Record<SortOpt, string> = {
  recent: '最近解析',
  oldest: '最早解析',
  name:   '姓名 A→Z',
  score:  '匹配分↓',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardClient({ initial, user }: { initial: Candidate[]; user: User }) {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  // ── View state ──
  const [view, setView]             = useState<'table' | 'card'>('table');
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter]           = useState<string>('全部');
  const [roleCategoryFilter, setRoleCategoryFilter] = useState<string>('全部');
  const [sort, setSort]             = useState<SortOpt>('recent');
  const [rows, setRows]             = useState(initial);

  // ── Interaction state ──
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [animKey, setAnimKey]                 = useState(0);
  const [hoveredCardId, setHoveredCardId]     = useState<string | null>(null);

  // ── Persist to localStorage (read on mount) ──
  useEffect(() => {
    try {
      const v = localStorage.getItem('sift-dash-view');
      if (v === 'table' || v === 'card') setView(v);
      const s = localStorage.getItem('sift-dash-sort');
      if (s && SORT_OPTS.includes(s as SortOpt)) setSort(s as SortOpt);
      const sf = localStorage.getItem('sift-dash-status');
      if (sf) setStatusFilter(sf);
      const rf = localStorage.getItem('sift-dash-role');
      if (rf) setRoleCategoryFilter(rf);
    } catch { /* SSR guard */ }
  }, []);
  useEffect(() => { try { localStorage.setItem('sift-dash-view',   view);   } catch { /* */ } }, [view]);
  useEffect(() => { try { localStorage.setItem('sift-dash-sort',   sort);   } catch { /* */ } }, [sort]);
  useEffect(() => { try { localStorage.setItem('sift-dash-status', statusFilter);         } catch { /* */ } }, [statusFilter]);
  useEffect(() => { try { localStorage.setItem('sift-dash-role',   roleCategoryFilter);   } catch { /* */ } }, [roleCategoryFilter]);

  // ── Animate cards on filter/sort/search change ──
  useEffect(() => { setAnimKey((k) => k + 1); }, [statusFilter, roleCategoryFilter, search, sort]);

  // ── Polling for pending extractions ──
  const pendingIds = useMemo(
    () => rows.filter((r) => r.extractionStatus !== 'parsed' && r.extractionStatus !== 'error').map((r) => r.id),
    [rows]
  );
  const polled = useJobPoll(pendingIds, pendingIds.length > 0);
  useEffect(() => {
    setRows((prev) =>
      prev.map((r) => {
        const p = polled[r.id];
        if (!p || p.extractionStatus === r.extractionStatus) return r;
        return { ...r, extractionStatus: p.extractionStatus, extractionError: p.extractionError ?? null };
      })
    );
  }, [polled]);

  // ── Derived data ──
  const filtered = useMemo(() => {
    let list = rows;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name ?? '').toLowerCase().includes(q) ||
          (c.role ?? '').toLowerCase().includes(q) ||
          (c.school ?? '').toLowerCase().includes(q) ||
          (c.skills ?? []).some((s) => s.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== '全部') list = list.filter((c) => c.status === statusFilter);
    if (roleCategoryFilter !== '全部') list = list.filter((c) => c.roleCategory === roleCategoryFilter);
    return [...list].sort((a, b) => {
      if (sort === 'recent') return b.updatedAt.getTime() - a.updatedAt.getTime();
      if (sort === 'oldest') return a.updatedAt.getTime() - b.updatedAt.getTime();
      if (sort === 'score')  return bestScore(b) - bestScore(a);
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
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
    total:     rows.length,
    pending:   rows.filter((r) => r.status === '待筛选').length,
    interview: rows.filter((r) => r.status === '面试中').length,
    hired:     rows.filter((r) => r.status === '已录用').length,
  }), [rows]);

  // ── Handlers ──

  function clearFilters() {
    setSearch('');
    setStatusFilter('全部');
    setRoleCategoryFilter('全部');
  }

  async function handleRetry(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    try {
      const res = await fetch(`/api/candidates/${id}/retry`, { method: 'POST' });
      if (!res.ok) throw new Error('retry failed');
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, extractionStatus: 'uploaded' } : r));
      messageApi.success('已重新加入解析队列');
    } catch {
      messageApi.error('重试失败，请稍后再试');
    }
  }

  async function handleStatusChange(id: string, status: CandidateStatus) {
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('update failed');
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      messageApi.success('状态已更新');
    } catch {
      messageApi.error('更新失败');
    } finally {
      setEditingStatusId(null);
    }
  }

  async function handleBatchStatus(status: CandidateStatus) {
    const results = await Promise.allSettled(
      selectedRowKeys.map((id) =>
        fetch(`/api/candidates/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
      )
    );
    const succeeded = selectedRowKeys.filter((_, i) => results[i].status === 'fulfilled');
    const failed    = selectedRowKeys.filter((_, i) => results[i].status === 'rejected');
    setRows((prev) => prev.map((r) => succeeded.includes(r.id) ? { ...r, status } : r));
    if (succeeded.length > 0) messageApi.success(`${succeeded.length} 位候选人状态已更新`);
    if (failed.length    > 0) messageApi.error(`${failed.length} 位更新失败`);
    setSelectedRowKeys([]);
  }

  function handleBatchDelete() {
    Modal.confirm({
      title: `确认删除 ${selectedRowKeys.length} 位候选人？`,
      content: '此操作不可撤销，PDF 文件将同步删除。',
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: async () => {
        const results = await Promise.allSettled(
          selectedRowKeys.map((id) => fetch(`/api/candidates/${id}`, { method: 'DELETE' }))
        );
        const succeeded = selectedRowKeys.filter((_, i) => results[i].status === 'fulfilled');
        const failed    = selectedRowKeys.filter((_, i) => results[i].status === 'rejected');
        setRows((prev) => prev.filter((r) => !succeeded.includes(r.id)));
        if (succeeded.length > 0) messageApi.success(`已删除 ${succeeded.length} 位候选人`);
        if (failed.length    > 0) messageApi.error(`${failed.length} 位删除失败`);
        setSelectedRowKeys([]);
      },
    });
  }

  function addToCompare(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    try {
      const stored = sessionStorage.getItem('sift-compare-ids');
      const ids: string[] = stored ? JSON.parse(stored) : [];
      if (ids.includes(id)) { messageApi.info('已在对比列表中'); return; }
      if (ids.length >= 3)  { messageApi.warning('最多对比 3 位候选人'); return; }
      ids.push(id);
      sessionStorage.setItem('sift-compare-ids', JSON.stringify(ids));
      messageApi.success({
        content: (
          <span>
            已添加到对比&nbsp;
            <a onClick={() => router.push('/compare')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>
              前往对比 →
            </a>
          </span>
        ),
      });
    } catch { /* sessionStorage guard */ }
  }

  function handleBatchCompare() {
    try {
      const toAdd = selectedRowKeys.slice(0, 3);
      sessionStorage.setItem('sift-compare-ids', JSON.stringify(toAdd));
      messageApi.success({
        content: (
          <span>
            已添加 {toAdd.length} 位到对比&nbsp;
            <a onClick={() => router.push('/compare')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>
              前往对比 →
            </a>
          </span>
        ),
      });
      setSelectedRowKeys([]);
    } catch { /* sessionStorage guard */ }
  }

  // ── Match tooltip content ──
  function matchTooltip(c: Candidate) {
    const results = c.matchResults ?? [];
    if (results.length === 0) return null;
    return (
      <div style={{ minWidth: 140 }}>
        {results.map((r) => (
          <div key={r.jdId} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
            <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.jdTitle}
            </span>
            <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{r.overall}</span>
          </div>
        ))}
      </div>
    );
  }

  // ── Inline status cell ──
  function renderStatusCell(c: Candidate) {
    if (c.extractionStatus === 'error') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--danger-700)' }}>解析失败</span>
          <Button
            size="small"
            danger
            type="link"
            icon={<SyncOutlined />}
            onClick={(e) => handleRetry(c.id, e)}
            style={{ padding: '0 2px', height: 'auto' }}
          >
            重试
          </Button>
        </div>
      );
    }
    if (c.extractionStatus !== 'parsed') {
      return (
        <span style={{ fontSize: 12, color: 'var(--accent-700)' }}>
          {c.extractionStatus === 'extracting' ? 'AI 解析中' : '等待解析'}
        </span>
      );
    }
    if (editingStatusId === c.id) {
      return (
        <Select
          size="small"
          value={c.status}
          options={CANDIDATE_STATUS.map((s) => ({ label: s, value: s }))}
          onChange={(v) => handleStatusChange(c.id, v)}
          onClick={(e) => e.stopPropagation()}
          onBlur={() => setEditingStatusId(null)}
          autoFocus
          style={{ width: 110 }}
        />
      );
    }
    return (
      <div
        onClick={(e) => { e.stopPropagation(); setEditingStatusId(c.id); }}
        style={{ cursor: 'pointer', display: 'inline-block' }}
        title="点击修改状态"
      >
        <StatusPill status={c.status} />
      </div>
    );
  }

  // ── Table columns ──
  const columns: ColumnsType<Candidate> = [
    {
      title: '候选人',
      key: 'name',
      render: (_, c) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={c.name ?? '?'} size={32} />
          <div>
            <div style={{ fontWeight: 500, color: 'var(--fg)' }}>
              {highlight(c.name, search) || '(未提取)'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
              {c.city ?? ''}{c.email ? ` · ${c.email}` : ''}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '目标岗位',
      key: 'role',
      render: (_, c) => (
        <div>
          <div style={{ color: 'var(--fg)' }}>{highlight(c.role, search) || '—'}</div>
          {c.years != null && (
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {c.years} 年
            </div>
          )}
        </div>
      ),
    },
    {
      title: '技能',
      key: 'skills',
      render: (_, c) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 180 }}>
          {(c.skills ?? []).slice(0, 3).map((s) => <SkillTag key={s}>{s}</SkillTag>)}
          {(c.skills?.length ?? 0) > 3 && (
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)', alignSelf: 'center' }}>
              +{(c.skills?.length ?? 0) - 3}
            </span>
          )}
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
      render: (_, c) => renderStatusCell(c),
    },
    {
      title: '匹配',
      key: 'match',
      render: (_, c) => {
        const score = bestScore(c);
        if (score === 0) return <span style={{ color: 'var(--fg-subtle)' }}>—</span>;
        const results = c.matchResults ?? [];
        const best = results.reduce((m, r) => r.overall > m.overall ? r : m, results[0]);
        const jdName = (best?.jdTitle ?? '').slice(0, 8);
        return (
          <Tooltip title={matchTooltip(c)} placement="left">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'default' }}>
              <ScoreRing score={score} size={36} />
              <span style={{ fontSize: 11, color: 'var(--fg-subtle)', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {jdName}
              </span>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: '更新',
      key: 'updatedAt',
      render: (_, c) => (
        <span style={{ fontSize: 12, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>
          {c.updatedAt.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      title: '',
      key: 'arrow',
      width: 40,
      render: () => <I.ChevR size={14} style={{ color: 'var(--fg-subtle)' }} />,
    },
  ];

  // ── Segmented options ──
  const statusSegmentedOptions = STATUS_TABS.map((s) => ({
    label: `${s} ${counts[s] ?? 0}`,
    value: s,
  }));
  const roleSegmentedOptions = ['全部' as const, ...ROLE_CATEGORIES].map((cat) => ({
    label: `${cat} ${roleCategoryCounts[cat] ?? 0}`,
    value: cat,
  }));

  // ── Empty state content ──
  const emptyContent = (
    <div style={{ padding: 48, textAlign: 'center' }}>
      {rows.length === 0 ? (
        <span style={{ color: 'var(--fg-subtle)' }}>
          还没有候选人。前往
          <Link href="/upload" style={{ color: 'var(--accent)', textDecoration: 'none', margin: '0 4px' }}>
            上传
          </Link>
          开始。
        </span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <I.Search size={40} style={{ color: 'var(--fg-subtle)', opacity: 0.35 }} />
          <div style={{ fontSize: 15, color: 'var(--fg-subtle)' }}>没有匹配的候选人</div>
          <Button onClick={clearFilters}>清空筛选</Button>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────

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
          <Button
            icon={<I.Download size={15} />}
            onClick={() => downloadCSV(filtered)}
            title="导出当前筛选结果为 CSV"
          >
            导出
          </Button>
        </Space>
      }
    >
      {contextHolder}
      <div style={{ padding: '20px 24px' }}>

        {/* KPI strip */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <KpiCard label="全部候选人" value={kpi.total}     sub="已录入系统"   filterStatus="全部"  activeFilter={statusFilter} onFilter={setStatusFilter} />
          <KpiCard label="待筛选"     value={kpi.pending}   sub="等待初筛"     filterStatus="待筛选" activeFilter={statusFilter} onFilter={setStatusFilter} />
          <KpiCard label="面试中"     value={kpi.interview} sub="进入面试阶段" filterStatus="面试中" activeFilter={statusFilter} onFilter={setStatusFilter} />
          <KpiCard label="已录用"     value={kpi.hired}     sub="完成录用"     filterStatus="已录用" activeFilter={statusFilter} onFilter={setStatusFilter} />
        </div>

        {/* Filter + Table/Card card */}
        <Card>
          {/* Status filter + view toggle */}
          <div style={{ padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
            <Segmented
              options={statusSegmentedOptions}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as string)}
            />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button
                icon={<SortAscendingOutlined />}
                onClick={() => {
                  const idx = SORT_OPTS.indexOf(sort);
                  setSort(SORT_OPTS[(idx + 1) % SORT_OPTS.length]);
                }}
              >
                {SORT_LABELS[sort]}
              </Button>
              <Segmented
                options={[
                  { value: 'table', icon: <I.List size={16} /> },
                  { value: 'card',  icon: <I.Grid size={16} /> },
                ]}
                value={view}
                onChange={(v) => setView(v as 'table' | 'card')}
              />
            </div>
          </div>

          {/* Role category filter */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
            <Segmented
              options={roleSegmentedOptions}
              value={roleCategoryFilter}
              onChange={(v) => setRoleCategoryFilter(v as string)}
            />
          </div>

          {/* Batch action bar */}
          {selectedRowKeys.length > 0 && (
            <div style={{
              position: 'sticky', top: 0, zIndex: 10,
              background: 'var(--bg)', borderBottom: '1px solid var(--border-accent)',
              padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center',
              animation: 'sift-fade-in 0.25s ease both',
            }}>
              <span style={{ fontWeight: 500, color: 'var(--fg)', marginRight: 4 }}>
                已选 <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{selectedRowKeys.length}</span> 位
              </span>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>取消</Button>
              <Select
                size="small"
                placeholder="批量改状态"
                style={{ width: 120 }}
                options={CANDIDATE_STATUS.map((s) => ({ label: s, value: s }))}
                onChange={(v: CandidateStatus) => handleBatchStatus(v)}
                value={undefined}
              />
              <Button
                size="small"
                icon={<I.Compare size={14} />}
                onClick={handleBatchCompare}
              >
                添加到对比
              </Button>
              <Button
                size="small"
                danger
                icon={<I.Trash size={14} />}
                onClick={handleBatchDelete}
              >
                删除
              </Button>
            </div>
          )}

          {/* Table view */}
          {view === 'table' ? (
            <Table
              dataSource={filtered}
              columns={columns}
              rowKey="id"
              pagination={false}
              rowSelection={{
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys as string[]),
              }}
              onRow={(c) => ({
                onClick:      () => router.push(`/candidates/${c.id}`),
                onMouseEnter: () => router.prefetch(`/candidates/${c.id}`),
                style:        { cursor: 'pointer' },
              })}
              locale={{ emptyText: emptyContent }}
            />
          ) : (
            /* Card grid — key=animKey triggers enter animation on filter/sort change */
            <div
              key={animKey}
              style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}
            >
              {filtered.map((c, index) => {
                const isSelected  = selectedRowKeys.includes(c.id);
                const isHovered   = hoveredCardId === c.id;
                const score       = bestScore(c);

                return (
                  <div
                    key={c.id}
                    style={{ animation: 'sift-fade-in 0.3s ease both', animationDelay: `${index * 40}ms` }}
                  >
                    <Card
                      style={{
                        padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
                        cursor: 'pointer', position: 'relative',
                        border: isSelected ? '2px solid var(--accent-500)' : '2px solid transparent',
                        transform:  isHovered ? 'translateY(-3px)' : undefined,
                        boxShadow:  isHovered ? 'var(--shadow-2)'  : undefined,
                        transition: 'transform var(--dur-base) ease, box-shadow var(--dur-base) ease, border var(--dur-base) ease',
                      }}
                      onClick={() => router.push(`/candidates/${c.id}`)}
                      onMouseEnter={() => {
                        setHoveredCardId(c.id);
                        router.prefetch(`/candidates/${c.id}`);
                      }}
                      onMouseLeave={() => setHoveredCardId(null)}
                    >
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        {/* Avatar doubles as selection toggle */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRowKeys((prev) =>
                              prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          title={isSelected ? '取消选择' : '选择此候选人'}
                          style={{
                            outline: isSelected ? '2px solid var(--accent-500)' : undefined,
                            borderRadius: '50%',
                          }}
                        >
                          <Avatar name={c.name ?? '?'} size={40} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>
                            {highlight(c.name, search) || '(未提取)'}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 2 }}>
                            {highlight(c.role, search) || '—'}
                          </div>
                          {c.years != null && (
                            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                              {c.years} 年
                            </div>
                          )}
                        </div>
                        {score > 0 && <ScoreRing score={score} size={40} />}
                      </div>

                      {/* Skills */}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(c.skills ?? []).slice(0, 4).map((s) => <SkillTag key={s}>{s}</SkillTag>)}
                      </div>

                      {/* Footer: status / retry */}
                      <div style={{ paddingTop: 10, borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {c.extractionStatus === 'error' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 12, color: 'var(--danger-700)' }}>解析失败</span>
                            <Button
                              size="small" danger type="link"
                              icon={<SyncOutlined />}
                              onClick={(e) => handleRetry(c.id, e)}
                              style={{ padding: '0 2px', height: 'auto' }}
                            >
                              重试
                            </Button>
                          </div>
                        ) : c.extractionStatus === 'parsed' ? (
                          editingStatusId === c.id ? (
                            <Select
                              size="small"
                              value={c.status}
                              options={CANDIDATE_STATUS.map((s) => ({ label: s, value: s }))}
                              onChange={(v) => handleStatusChange(c.id, v)}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={() => setEditingStatusId(null)}
                              autoFocus
                              style={{ width: 110 }}
                            />
                          ) : (
                            <div
                              onClick={(e) => { e.stopPropagation(); setEditingStatusId(c.id); }}
                              style={{ cursor: 'pointer', display: 'inline-block' }}
                              title="点击修改状态"
                            >
                              <StatusPill status={c.status} />
                            </div>
                          )
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
                            {c.extractionStatus === 'extracting' ? 'AI 解析中' : '等待解析'}
                          </span>
                        )}
                      </div>
                    </Card>
                  </div>
                );
              })}

              {/* Card empty state */}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1/-1' }}>
                  {emptyContent}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </PageLayout>
  );
}
