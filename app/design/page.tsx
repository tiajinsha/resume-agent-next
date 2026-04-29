'use client';
// Design System — aggregates the 20 preview cards from sift-design-system/preview
// into a single navigable page.
import React from 'react';
import {
  Btn, Badge, SkillTag, StatusPill, Card, Input, ScoreRing,
  SiftLogo, Avatar,
} from '@/components/ui';
import { I } from '@/components/icons';

const microLabel = {
  fontFamily: 'var(--font-mono)', fontSize: 11,
  color: 'var(--fg-subtle)',
  textTransform: 'uppercase', letterSpacing: '0.04em',
  fontWeight: 500,
} as const;

const sectionTitle = {
  fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600,
  letterSpacing: '-0.01em', color: 'var(--fg)', margin: 0,
} as const;
const sectionLead = {
  fontSize: 13, color: 'var(--fg-muted)', marginTop: 4,
} as const;

function Section({ id, title, lead, children }: { id: string; title: React.ReactNode; lead?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} style={{ padding: '40px 0', borderBottom: '1px solid var(--border)' }}>
      <header style={{ marginBottom: 20 }}>
        <div style={microLabel as React.CSSProperties}>{id}</div>
        <h2 style={sectionTitle as React.CSSProperties}>{title}</h2>
        {lead && <p style={sectionLead as React.CSSProperties}>{lead}</p>}
      </header>
      {children}
    </section>
  );
}

function SpecRow({ children, meta }: { children: React.ReactNode; meta: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      gap: 24, padding: '12px 0',
      borderBottom: '1px dashed var(--border)',
    }}>
      <div>{children}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>{meta}</div>
    </div>
  );
}

// --- Typography ---
function TypeFamilies() {
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ paddingBottom: 14, borderBottom: '1px dashed var(--border)' }}>
        <div style={microLabel as React.CSSProperties}>Display &amp; UI · Geist</div>
        <div style={{ fontFamily: "'Geist', sans-serif", fontWeight: 600, fontSize: 22, letterSpacing: '-0.01em', color: 'var(--fg)', marginTop: 6 }}>The quick brown fox — 2026</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>Latin · wght 400 500 600 700</div>
      </div>
      <div style={{ padding: '14px 0', borderBottom: '1px dashed var(--border)' }}>
        <div style={microLabel as React.CSSProperties}>CJK · Noto Sans SC</div>
        <div style={{ fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 500, fontSize: 22, color: 'var(--fg)', marginTop: 6 }}>思筛让筛选简历这件事变得从容</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>简体中文 · wght 400 500 600 700</div>
      </div>
      <div style={{ padding: '14px 0' }}>
        <div style={microLabel as React.CSSProperties}>Mono · Geist Mono</div>
        <div style={{ fontFamily: "'Geist Mono', monospace", fontWeight: 500, fontSize: 22, color: 'var(--fg)', marginTop: 6, fontFeatureSettings: "'tnum'" }}>cand_0f83 · score: 87.4 / 100</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>tabular-nums enabled by default</div>
      </div>
    </Card>
  );
}

function TypeDisplay() {
  return (
    <Card style={{ padding: 20 }}>
      <SpecRow meta="display · 48 / 1.1 / 600"><div className="type-display">智能筛选 Sift</div></SpecRow>
      <SpecRow meta="h1 · 32 / 1.2 / 600"><div className="type-h1">候选人画像一览</div></SpecRow>
      <SpecRow meta="h2 · 24 / 1.3 / 600"><div className="type-h2">Senior Frontend Engineer</div></SpecRow>
      <SpecRow meta="h3 · 18 / 1.4 / 600"><div className="type-h3">教育背景与工作经历</div></SpecRow>
    </Card>
  );
}

function TypeBody() {
  return (
    <Card style={{ padding: 20 }}>
      <SpecRow meta="body · 14 / 1.55 / 400">
        <div className="type-body" style={{ maxWidth: 420 }}>候选人匹配度为 87 分,在技能维度表现突出,具备 5 年以上前端开发经验。</div>
      </SpecRow>
      <SpecRow meta="small · 13 / 1.5 / 400"><div className="type-small" style={{ color: 'var(--fg-muted)' }}>教育背景契合度 · 综合评语见右侧面板</div></SpecRow>
      <SpecRow meta="label · 12 / 1.4 / 500"><div className="type-label">姓名 / Full Name</div></SpecRow>
      <SpecRow meta="micro · 11 / caps / 500"><div className="type-micro">最后更新 · 2 MIN AGO</div></SpecRow>
      <SpecRow meta="mono · Geist Mono · tnum"><div className="type-mono">cand_0f83a1b · sha256:94e2…</div></SpecRow>
    </Card>
  );
}

function TypeWeights() {
  const rows: [string, number][] = [
    ['Regular · 400', 400],
    ['Medium · 500', 500],
    ['Semibold · 600', 600],
    ['Bold · 700', 700],
  ];
  return (
    <Card style={{ padding: 20 }}>
      {rows.map(([meta, w], i) => (
        <div key={w} style={{
          display: 'flex', alignItems: 'baseline', gap: 20,
          padding: '10px 0',
          borderBottom: i < rows.length - 1 ? '1px dashed var(--border)' : 'none',
        }}>
          <span style={{ ...(microLabel as React.CSSProperties), width: 120 }}>{meta}</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 22, letterSpacing: '-0.01em', flex: 1, color: 'var(--fg)', fontWeight: w }}>
            Sift · 思筛 · 候选人管理
          </span>
        </div>
      ))}
    </Card>
  );
}

// --- Colors ---
function ColorsThemes() {
  const half: React.CSSProperties = { padding: 24, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 260 };
  const card: React.CSSProperties = { padding: '12px 14px', borderRadius: 10, border: '1px solid' };
  const pillBase: React.CSSProperties = { padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500 };
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ ...half, background: 'oklch(0.99 0.003 80)', color: 'oklch(0.17 0.01 260)' }}>
          <span style={{ ...(microLabel as React.CSSProperties), color: 'currentColor', opacity: 0.6 }}>Light · 亮色</span>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>候选人 87</div>
          <div style={{ ...card, borderColor: 'oklch(0.92 0.005 260)', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>匹配度</span>
              <span style={{ ...pillBase, background: 'oklch(0.56 0.16 275)', color: 'white' }}>87 / 100</span>
            </div>
            <div style={{ fontSize: 11, fontFamily: "'Geist Mono', monospace", opacity: 0.6, marginTop: 6 }}>canvas · neutral-25</div>
          </div>
        </div>
        <div style={{ ...half, background: 'oklch(0.17 0.01 260)', color: 'oklch(0.96 0.005 80)' }}>
          <span style={{ ...(microLabel as React.CSSProperties), color: 'currentColor', opacity: 0.6 }}>Dark · 暗色</span>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>候选人 87</div>
          <div style={{ ...card, borderColor: 'oklch(0.25 0.008 260)', background: 'oklch(0.22 0.01 260)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>匹配度</span>
              <span style={{ ...pillBase, background: 'oklch(0.66 0.15 275)', color: 'oklch(0.17 0.01 260)' }}>87 / 100</span>
            </div>
            <div style={{ fontSize: 11, fontFamily: "'Geist Mono', monospace", opacity: 0.6, marginTop: 6 }}>canvas · neutral-900</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

type SwatchItem = { token: string; label: string; outline?: boolean; darkFg?: boolean };

function Swatches({ items, cols, legend }: { items: SwatchItem[]; cols: number; legend?: React.ReactNode[] }) {
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6 }}>
        {items.map(({ token, label, outline, darkFg }) => (
          <div key={token} style={{
            aspectRatio: '1 / 1.2', borderRadius: 8,
            border: '1px solid var(--border)',
            background: `var(${token})`,
            display: 'flex', alignItems: 'flex-end', padding: 6,
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: darkFg ? 'rgba(255,255,255,.8)' : 'var(--fg-subtle)',
            outline: outline ? '2px solid var(--accent-500)' : 'none',
            outlineOffset: outline ? 2 : 0,
          }}>{label}</div>
        ))}
      </div>
      {legend && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 14, ...(microLabel as React.CSSProperties),
        }}>
          {legend.map((x, i) => <span key={i}>{x}</span>)}
        </div>
      )}
    </Card>
  );
}

function ColorsNeutral() {
  const items: SwatchItem[] = [
    { token: '--neutral-0',   label: '0' },
    { token: '--neutral-25',  label: '25' },
    { token: '--neutral-50',  label: '50' },
    { token: '--neutral-100', label: '100' },
    { token: '--neutral-200', label: '200' },
    { token: '--neutral-300', label: '300' },
    { token: '--neutral-400', label: '400', darkFg: true },
    { token: '--neutral-500', label: '500', darkFg: true },
    { token: '--neutral-600', label: '600', darkFg: true },
    { token: '--neutral-700', label: '700', darkFg: true },
    { token: '--neutral-800', label: '800', darkFg: true },
    { token: '--neutral-900', label: '900', darkFg: true },
    { token: '--neutral-950', label: '950', darkFg: true },
  ];
  return <Swatches items={items} cols={13} legend={['Neutral · warm-tinted', 'OKLCH · chroma 0.003–0.012']} />;
}

function ColorsAccent() {
  const items: SwatchItem[] = [
    { token: '--accent-50',  label: '50' },
    { token: '--accent-100', label: '100' },
    { token: '--accent-200', label: '200' },
    { token: '--accent-300', label: '300', darkFg: true },
    { token: '--accent-400', label: '400', darkFg: true },
    { token: '--accent-500', label: '500', darkFg: true, outline: true },
    { token: '--accent-600', label: '600', darkFg: true },
    { token: '--accent-700', label: '700', darkFg: true },
  ];
  return (
    <Swatches
      items={items}
      cols={8}
      legend={[
        <>紫玉 Purple Jade · <span style={{ color: 'var(--accent)', fontWeight: 600 }}>500 is primary</span></>,
        'hue 275',
      ]}
    />
  );
}

function ColorsSemantic() {
  const col = (name: string, tokens: string[], tag: string) => (
    <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {tokens.map((t) => (
        <div key={t} style={{ height: 42, borderRadius: 6, border: '1px solid var(--border)', background: `var(${t})` }} />
      ))}
      <div style={{ ...(microLabel as React.CSSProperties), color: 'var(--fg)', fontWeight: 500, marginTop: 6 }}>{name}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-subtle)' }}>{tag}</div>
    </div>
  );
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {col('Success', ['--success-500', '--success-300', '--success-100'], 'matcha · hue 150')}
        {col('Warn',    ['--warn-500',    '--warn-300',    '--warn-100'],    'amber · hue 75')}
        {col('Danger',  ['--danger-500',  '--danger-300',  '--danger-100'],  'coral · hue 25')}
        {col('Info',    ['--info-500',    '--info-300',    '--info-100'],    'slate · hue 235')}
      </div>
    </Card>
  );
}

function ColorsScore() {
  const tick = [0, 25, 50, 75, 100];
  const markers = [
    { t: '--score-0',   v: '32 · 差' },
    { t: '--score-40',  v: '48 · 一般' },
    { t: '--score-60',  v: '66 · 良好' },
    { t: '--score-80',  v: '81 · 优秀' },
    { t: '--score-100', v: '94 · 杰出' },
  ];
  return (
    <Card style={{ padding: 20 }}>
      <div style={{
        height: 48, borderRadius: 10,
        background: 'linear-gradient(to right, var(--score-0), var(--score-40) 40%, var(--score-60) 60%, var(--score-80) 80%, var(--score-100))',
        border: '1px solid var(--border)',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-subtle)' }}>
        {tick.map((n) => <span key={n}>{n}</span>)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        {markers.map((m) => (
          <div key={m.t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: `var(${m.t})`, border: '1px solid var(--border)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg)', fontWeight: 500 }}>{m.v}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// --- Layout ---
function SpacingScale() {
  const rows: [string, number][] = [
    ['space-1', 4],   ['space-2', 8],   ['space-3', 12],  ['space-4', 16],
    ['space-5', 20],  ['space-6', 24],  ['space-7', 32],  ['space-8', 40],
    ['space-9', 48],  ['space-10', 64], ['space-11', 80], ['space-12', 96],
  ];
  return (
    <Card style={{ padding: 20 }}>
      {rows.map(([name, px]) => (
        <div key={name} style={{
          display: 'grid', gridTemplateColumns: '100px 60px 1fr',
          gap: 16, alignItems: 'center', padding: '5px 0',
        }}>
          <span style={{ ...(microLabel as React.CSSProperties), color: 'var(--fg)' }}>{name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-subtle)', textAlign: 'right' }}>{px}px</span>
          <div><div style={{ height: 12, background: 'var(--accent-500)', borderRadius: 3, width: px }} /></div>
        </div>
      ))}
    </Card>
  );
}

function Radii() {
  const items: [string, number][] = [
    ['sm', 4], ['md', 8], ['lg', 12], ['xl', 20], ['full', 9999],
  ];
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 18 }}>
        {items.map(([name, r]) => (
          <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: '100%', aspectRatio: 1,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-1)',
              borderRadius: r,
            }} />
            <span style={{ ...(microLabel as React.CSSProperties), color: 'var(--fg)', fontWeight: 500 }}>{name}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-subtle)' }}>{r === 9999 ? '9999px' : `${r}px`}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Shadows() {
  const items = [
    { name: 'shadow-1', tag: 'resting cards', style: { boxShadow: 'var(--shadow-1)' } },
    { name: 'shadow-2', tag: 'menus · popovers', style: { boxShadow: 'var(--shadow-2)' } },
    { name: 'shadow-3', tag: 'modals', style: { boxShadow: 'var(--shadow-3)' } },
    { name: 'focus',    tag: '3px accent ring', style: { boxShadow: 'var(--shadow-focus)', border: '1px solid var(--border)' } },
  ];
  return (
    <Card style={{ padding: '36px 20px', background: 'var(--neutral-50)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {items.map((it) => (
          <div key={it.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ width: '100%', height: 72, background: 'var(--bg-elevated)', borderRadius: 10, ...it.style }} />
            <span style={{ ...(microLabel as React.CSSProperties), color: 'var(--fg)', fontWeight: 500 }}>{it.name}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-subtle)' }}>{it.tag}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// --- Components ---
function ButtonsShowcase() {
  const rowStyle: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 };
  const labelStyle: React.CSSProperties = { ...(microLabel as React.CSSProperties), width: 90 };
  return (
    <Card style={{ padding: 20 }}>
      <div style={rowStyle}>
        <span style={labelStyle}>Primary</span>
        <Btn variant="primary" icon={<I.Upload />}>上传简历</Btn>
        <Btn variant="primary">开始筛选</Btn>
        <Btn variant="primary" size="sm">保存</Btn>
        <Btn variant="primary" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>禁用态</Btn>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Secondary</span>
        <Btn>取消</Btn>
        <Btn icon={<I.Search />}>搜索</Btn>
        <Btn>导出 CSV</Btn>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Ghost</span>
        <Btn variant="ghost">查看详情</Btn>
        <Btn variant="ghost" icon={<I.MoreH />} />
      </div>
      <div style={{ ...rowStyle, marginBottom: 0 }}>
        <span style={labelStyle}>Danger</span>
        <Btn variant="danger">删除候选人</Btn>
      </div>
    </Card>
  );
}

function BadgesShowcase() {
  const rowStyle: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 };
  const labelStyle: React.CSSProperties = { ...(microLabel as React.CSSProperties), width: 100 };
  return (
    <Card style={{ padding: 20 }}>
      <div style={rowStyle}>
        <span style={labelStyle}>Status</span>
        <StatusPill status="待筛选" />
        <StatusPill status="初筛通过" />
        <StatusPill status="面试中" />
        <StatusPill status="已录用" />
        <StatusPill status="已淘汰" />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Semantic</span>
        <Badge tone="accent">AI 提取</Badge>
        <Badge tone="success">+5 加分</Badge>
        <Badge tone="warn">待确认</Badge>
        <Badge tone="danger">低匹配</Badge>
        <Badge tone="info">JD 匹配</Badge>
      </div>
      <div style={{ ...rowStyle, marginBottom: 0 }}>
        <span style={labelStyle}>Skill tags</span>
        <SkillTag strong>React</SkillTag>
        <SkillTag strong>TypeScript</SkillTag>
        <SkillTag>Node.js</SkillTag>
        <SkillTag>GraphQL</SkillTag>
        <SkillTag>Webpack</SkillTag>
        <SkillTag>Figma</SkillTag>
      </div>
    </Card>
  );
}

function InputsShowcase() {
  const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 };
  const lab: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--fg)' };
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--fg-subtle)' };
  const err: React.CSSProperties = { fontSize: 12, color: 'var(--danger-700)' };
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={field}>
          <label style={lab}>姓名</label>
          <Input defaultValue="张远哲" />
          <span style={hint}>来自 AI 提取 · 可修正</span>
        </div>
        <div style={field}>
          <label style={lab}>邮箱</label>
          <Input icon={<I.Mail />} defaultValue="zhang.yz@example.cn"
            style={{ borderColor: 'var(--accent-500)', boxShadow: 'var(--shadow-focus)' }} />
          <span style={hint}>:focus state</span>
        </div>
        <div style={field}>
          <label style={lab}>所在城市</label>
          <Input placeholder="例如:杭州市" />
          <span style={hint}>占位符示例</span>
        </div>
        <div style={field}>
          <label style={lab}>电话</label>
          <Input defaultValue="138-错误号码" style={{ borderColor: 'var(--danger-500)' }} />
          <span style={err}>电话格式不正确</span>
        </div>
      </div>
      <div style={field}>
        <label style={lab}>岗位描述 (JD)</label>
        <textarea defaultValue="负责核心业务前端开发,熟练掌握 React 和 TypeScript,具备大型项目架构设计经验…" style={{
          padding: '9px 12px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--bg-elevated)',
          fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg)',
          width: '100%', minHeight: 56, resize: 'vertical', outline: 'none',
        }} />
      </div>
    </Card>
  );
}

function CardsShowcase() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--fg)' }}>张远哲</div>
            <div style={{ ...(microLabel as React.CSSProperties), marginTop: 2 }}>Senior Frontend · 5 yrs</div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--accent)', fontFeatureSettings: "'tnum'" }}>
            87<span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 500, marginLeft: 2 }}>/100</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <SkillTag>React</SkillTag><SkillTag>TypeScript</SkillTag><SkillTag>Next.js</SkillTag>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px dashed var(--border)', ...(microLabel as React.CSSProperties) }}>
          <span>初筛通过</span><span>2 min ago</span>
        </div>
      </Card>
      <Card hover style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--fg)' }}>林雅婷</div>
            <div style={{ ...(microLabel as React.CSSProperties), marginTop: 2 }}>Full-stack · 3 yrs</div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--accent)', fontFeatureSettings: "'tnum'" }}>
            74<span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 500, marginLeft: 2 }}>/100</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <SkillTag>Vue</SkillTag><SkillTag>Node.js</SkillTag><SkillTag>Python</SkillTag>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px dashed var(--border)', ...(microLabel as React.CSSProperties) }}>
          <span>待筛选</span><span>:hover state</span>
        </div>
      </Card>
    </div>
  );
}

function DropzoneShowcase() {
  const zone = (active: boolean): React.CSSProperties => ({
    border: '2px dashed ' + (active ? 'var(--accent-300)' : 'var(--border-strong)'),
    background: active ? 'var(--accent-bg-subtle)' : 'var(--bg-elevated)',
    borderRadius: 12, padding: 28,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    textAlign: 'center', marginBottom: 14,
  });
  const iconStyle = (active: boolean): React.CSSProperties => ({
    color: active ? 'var(--accent-500)' : 'var(--fg-subtle)',
  });
  return (
    <Card style={{ padding: 20, background: 'var(--neutral-50)' }}>
      <div style={{ ...(microLabel as React.CSSProperties), marginBottom: 8 }}>:hover / active state</div>
      <div style={zone(true)}>
        <div style={iconStyle(true)}><I.Upload size={28} /></div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>松开鼠标上传简历</div>
        <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>支持批量 · 仅限 PDF · 最大 10MB/份</div>
      </div>
      <div style={{ ...(microLabel as React.CSSProperties), marginBottom: 8 }}>resting</div>
      <div style={zone(false)}>
        <div style={iconStyle(false)}><I.Upload size={28} /></div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>拖拽简历到此处,或点击上传</div>
        <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>支持批量 · 仅限 PDF · 最大 10MB/份</div>
      </div>
    </Card>
  );
}

function ScoreVizShowcase() {
  const bars: [string, number][] = [['技能', 92], ['经验', 84], ['教育', 78], ['项目', 88]];
  const values = [92, 84, 78, 88, 80];
  const angles = [-90, -18, 54, 126, 198].map((a) => (a * Math.PI) / 180);
  const pts = values.map((v, i) => [Math.cos(angles[i]) * (v / 100) * 46, Math.sin(angles[i]) * (v / 100) * 46]);
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <ScoreRing score={87} size={120} label="综合" />
          <div style={microLabel as React.CSSProperties}>Ring · 综合评分</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'stretch', justifyContent: 'center', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bars.map(([k, v]) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '68px 1fr 32px', gap: 8, alignItems: 'center', fontSize: 11 }}>
                <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>{k}</span>
                <div style={{ height: 6, background: 'var(--bg-sunken)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: v + '%', background: 'var(--accent-500)', borderRadius: 3 }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)', textAlign: 'right', fontFeatureSettings: "'tnum'" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={microLabel as React.CSSProperties}>Bars · 子维度</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <svg viewBox="-60 -60 120 120" width="150" height="150">
            <g fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="2 3">
              {[1, 0.75, 0.5, 0.25].map((r, i) => (
                <polygon key={i} points={[0, -50 * r, 47.55 * r, -15.45 * r, 29.39 * r, 40.45 * r, -29.39 * r, 40.45 * r, -47.55 * r, -15.45 * r].join(' ')} />
              ))}
            </g>
            <polygon points={pts.map((p) => p.join(',')).join(' ')} fill="oklch(0.56 0.16 275 / 0.2)" stroke="var(--accent-500)" strokeWidth="1.5" />
            <g fontFamily="Geist Mono, monospace" fontSize="8" fill="var(--fg-subtle)" textAnchor="middle">
              <text x="0" y="-55">技能</text><text x="54" y="-13">经验</text>
              <text x="32" y="49">教育</text><text x="-32" y="49">项目</text>
              <text x="-54" y="-13">沟通</text>
            </g>
          </svg>
          <div style={microLabel as React.CSSProperties}>Radar · 多维</div>
        </div>
      </div>
    </Card>
  );
}

function TableShowcase() {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--bg-sunken)' }}>
            {['候选人', '岗位', '技能', '匹配', '状态'].map((h, i) => (
              <th key={h} style={{
                fontSize: 11, fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: '0.04em',
                color: 'var(--fg-subtle)', textAlign: i === 3 ? 'right' : 'left',
                padding: '10px 16px', borderBottom: '1px solid var(--border)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name="张" size={28} />
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--fg)' }}>张远哲</div>
                  <div style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>zhang.yz · 杭州</div>
                </div>
              </div>
            </td>
            <td style={{ padding: '12px 16px' }}>前端工程师</td>
            <td style={{ padding: '12px 16px', color: 'var(--fg-subtle)', fontSize: 12 }}>React · TS · Next</td>
            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--fg)', fontFeatureSettings: "'tnum'" }}>87</td>
            <td style={{ padding: '12px 16px' }}><StatusPill status="初筛通过" /></td>
          </tr>
          <tr style={{ background: 'var(--bg-hover)' }}>
            <td style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name="林" size={28} />
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--fg)' }}>林雅婷</div>
                  <div style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>:hover state</div>
                </div>
              </div>
            </td>
            <td style={{ padding: '12px 16px' }}>全栈工程师</td>
            <td style={{ padding: '12px 16px', color: 'var(--fg-subtle)', fontSize: 12 }}>Vue · Node · Py</td>
            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--fg)', fontFeatureSettings: "'tnum'" }}>74</td>
            <td style={{ padding: '12px 16px' }}><StatusPill status="待筛选" /></td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

// --- Brand ---
function LogoShowcase() {
  const LogoSVG = ({ opacity = 0.55 }: { opacity?: number }) => (
    <svg viewBox="0 0 160 40" width={160} height={40}>
      <g transform="translate(4,8)">
        <rect x="0" y="0" width="24" height="4" rx="2" fill="currentColor" />
        <rect x="4" y="10" width="16" height="4" rx="2" fill="currentColor" />
        <rect x="8" y="20" width="8" height="4" rx="2" fill="currentColor" />
      </g>
      <text x="40" y="27" fontFamily="Geist" fontWeight="600" fontSize="22" letterSpacing="-0.02em" fill="currentColor">Sift</text>
      <text x="90" y="27" fontFamily="Noto Sans SC" fontWeight="500" fontSize="18" fill="currentColor" opacity={opacity}>思筛</text>
    </svg>
  );
  const Mark = () => (
    <svg viewBox="0 0 32 32" width={32} height={32}>
      <g transform="translate(4,4)">
        <rect x="0" y="0" width="24" height="4" rx="2" fill="currentColor" />
        <rect x="4" y="10" width="16" height="4" rx="2" fill="currentColor" />
        <rect x="8" y="20" width="8" height="4" rx="2" fill="currentColor" />
      </g>
    </svg>
  );
  const cell: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 28, position: 'relative', minHeight: 180,
  };
  const tag: React.CSSProperties = {
    position: 'absolute', top: 10, left: 14,
    fontFamily: 'var(--font-mono)', fontSize: 10,
    textTransform: 'uppercase', letterSpacing: '0.04em',
    opacity: 0.55,
  };
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ ...cell, background: 'var(--neutral-25)', color: 'var(--neutral-900)' }}>
          <span style={tag}>Light</span><LogoSVG opacity={0.55} />
        </div>
        <div style={{ ...cell, background: 'var(--neutral-900)', color: 'oklch(0.96 0.005 80)' }}>
          <span style={tag}>Dark</span><LogoSVG opacity={0.6} />
        </div>
        <div style={{ ...cell, background: 'var(--accent-500)', color: 'white' }}>
          <span style={tag}>On accent</span><LogoSVG opacity={0.7} />
        </div>
        <div style={{ ...cell, background: 'var(--neutral-50)', color: 'var(--accent-500)' }}>
          <span style={tag}>Mark · 32px &amp; 64px</span>
          <Mark /><div style={{ marginLeft: 16, color: 'var(--accent-500)' }}><svg viewBox="0 0 32 32" width={64} height={64}><g transform="translate(4,4)"><rect x="0" y="0" width="24" height="4" rx="2" fill="currentColor" /><rect x="4" y="10" width="16" height="4" rx="2" fill="currentColor" /><rect x="8" y="20" width="8" height="4" rx="2" fill="currentColor" /></g></svg></div>
        </div>
      </div>
    </Card>
  );
}

function IconShowcase() {
  const keys = Object.keys(I) as (keyof typeof I)[];
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '14px 10px' }}>
        {keys.map((k) => {
          const Ico = I[k];
          return (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--fg)' }}>
              <Ico size={20} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'lowercase' }}>{k}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, ...(microLabel as React.CSSProperties) }}>
        <span>Lucide · 1.5px stroke · currentColor</span>
        <span>20px default</span>
      </div>
    </Card>
  );
}

function VoiceShowcase() {
  const rows: [string, string, string][] = [
    ['Empty',   '还没有候选人。拖拽简历到此处开始。', '太棒了！快来添加第一位候选人吧'],
    ['Success', '已上传 12 份简历',                  '上传成功啦！'],
    ['Error',   '无法解析该 PDF。文件可能已加密或损坏。', '哎呀,出错了！请再试一次~'],
    ['CTA',     '开始筛选',                           '立即体验 →'],
  ];
  return (
    <Card style={{ padding: 20 }}>
      {rows.map(([label, yes, no], i) => (
        <div key={label} style={{
          display: 'grid', gridTemplateColumns: '110px 1fr 1fr',
          gap: 12, padding: '10px 0',
          borderBottom: i < rows.length - 1 ? '1px dashed var(--border)' : 'none',
          alignItems: 'start',
        }}>
          <span style={{ ...(microLabel as React.CSSProperties), paddingTop: 3 }}>{label}</span>
          <div style={{
            fontSize: 13, lineHeight: 1.5, padding: '8px 12px', borderRadius: 6,
            background: 'var(--success-100)', color: 'var(--success-700)',
          }}>{yes}</div>
          <div style={{
            fontSize: 13, lineHeight: 1.5, padding: '8px 12px', borderRadius: 6,
            background: 'var(--danger-100)', color: 'var(--danger-700)',
            textDecoration: 'line-through', textDecorationColor: 'var(--danger-500)',
          }}>{no}</div>
        </div>
      ))}
    </Card>
  );
}

const TOC = [
  { id: 'type-families', label: '字体族' },
  { id: 'type-display',  label: '显示字号' },
  { id: 'type-body',     label: '正文字号' },
  { id: 'type-weights',  label: '字重' },
  { id: 'colors-themes', label: '主题' },
  { id: 'colors-neutral',label: '中性色' },
  { id: 'colors-accent', label: '紫玉' },
  { id: 'colors-semantic', label: '语义色' },
  { id: 'colors-score',  label: '评分渐变' },
  { id: 'spacing',       label: '间距' },
  { id: 'radii',         label: '圆角' },
  { id: 'shadows',       label: '阴影' },
  { id: 'buttons',       label: '按钮' },
  { id: 'badges',        label: '徽章 / 标签' },
  { id: 'inputs',        label: '输入框' },
  { id: 'cards',         label: '卡片' },
  { id: 'dropzone',      label: '拖放区' },
  { id: 'score-viz',     label: '评分可视化' },
  { id: 'tables',        label: '表格' },
  { id: 'logo',          label: 'Logo' },
  { id: 'icons',         label: '图标' },
  { id: 'voice',         label: '语气' },
];

export default function DesignSystem() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, background: 'var(--bg)', minHeight: 'calc(100vh - 44px)' }}>
      <aside style={{
        position: 'sticky', top: 44, alignSelf: 'start',
        height: 'calc(100vh - 44px)', overflow: 'auto',
        borderRight: '1px solid var(--border)',
        padding: '24px 16px',
        display: 'flex', flexDirection: 'column', gap: 14,
        background: 'var(--bg-elevated)',
      }}>
        <div>
          <SiftLogo />
          <div style={{ ...(microLabel as React.CSSProperties), marginTop: 10 }}>设计系统 · v1</div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {TOC.map((t) => (
            <a key={t.id} href={`#${t.id}`} style={{
              padding: '5px 8px', borderRadius: 6,
              fontSize: 12, color: 'var(--fg-muted)',
              textDecoration: 'none',
            }}>{t.label}</a>
          ))}
        </nav>
      </aside>

      <div style={{ maxWidth: 960, padding: '32px 40px', margin: '0 auto', width: '100%' }}>
        <header style={{ marginBottom: 24 }}>
          <div style={microLabel as React.CSSProperties}>Sift · 思筛</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--fg)', margin: '6px 0 12px' }}>
            设计系统
          </h1>
          <p style={{ fontSize: 14, color: 'var(--fg-muted)', lineHeight: 1.6, margin: 0, maxWidth: 640 }}>
            企业级 AI 简历筛选平台的视觉基础与组件库。颜色定义为 OKLCH,语义 tokens 支持亮暗主题,组件全部使用 Lucide 1.5px 图标。
          </p>
        </header>

        <Section id="type-families" title="字体族" lead="Geist + Noto Sans SC + Geist Mono,全部来自 Google Fonts。">
          <TypeFamilies />
        </Section>
        <Section id="type-display" title="显示 &amp; 标题" lead="8 级模数 1.2,紧字距。">
          <TypeDisplay />
        </Section>
        <Section id="type-body" title="正文 &amp; 工具字">
          <TypeBody />
        </Section>
        <Section id="type-weights" title="字重">
          <TypeWeights />
        </Section>

        <Section id="colors-themes" title="主题" lead="两套主题,由 html[data-theme=&quot;dark&quot;] 切换。">
          <ColorsThemes />
        </Section>
        <Section id="colors-neutral" title="中性色" lead="暖中性,chroma 极低,避免冷灰。">
          <ColorsNeutral />
        </Section>
        <Section id="colors-accent" title="紫玉 Purple Jade" lead="单一暖色调强调色,hue 275。">
          <ColorsAccent />
        </Section>
        <Section id="colors-semantic" title="语义色" lead="Success / Warn / Danger / Info — 每个三档浓度。">
          <ColorsSemantic />
        </Section>
        <Section id="colors-score" title="评分渐变" lead="珊瑚 → 琥珀 → 抹茶,映射 0–100。">
          <ColorsScore />
        </Section>

        <Section id="spacing" title="间距" lead="4px 网格,12 档命名 tokens。">
          <SpacingScale />
        </Section>
        <Section id="radii" title="圆角">
          <Radii />
        </Section>
        <Section id="shadows" title="阴影" lead="两档硬朗阴影 + focus 环。">
          <Shadows />
        </Section>

        <Section id="buttons" title="按钮">
          <ButtonsShowcase />
        </Section>
        <Section id="badges" title="徽章 &amp; 标签">
          <BadgesShowcase />
        </Section>
        <Section id="inputs" title="输入框">
          <InputsShowcase />
        </Section>
        <Section id="cards" title="卡片">
          <CardsShowcase />
        </Section>
        <Section id="dropzone" title="拖放区">
          <DropzoneShowcase />
        </Section>
        <Section id="score-viz" title="评分可视化" lead="Ring / Bars / Radar 三种形态。">
          <ScoreVizShowcase />
        </Section>
        <Section id="tables" title="表格">
          <TableShowcase />
        </Section>

        <Section id="logo" title="Logo" lead="wordmark + mark,四种场景。">
          <LogoShowcase />
        </Section>
        <Section id="icons" title="图标" lead="Lucide 1.5px,currentColor,20px 默认。">
          <IconShowcase />
        </Section>
        <Section id="voice" title="语气" lead="自信、安静、精确。永不用 emoji。">
          <VoiceShowcase />
        </Section>
      </div>
    </div>
  );
}
