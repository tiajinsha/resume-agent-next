'use client';
// Marketing / Landing Page
import React from 'react';
import Link from 'next/link';
import { SiftLogo, Btn, Badge, SkillTag, Avatar, ScoreRing, ThemeToggle } from '@/components/ui';
import { I } from '@/components/icons';

const DEMO_CANDIDATES = [
  { id: 'demo1', name: '张远哲', years: 5, city: '杭州', score: 87, skills: ['React', 'TypeScript', 'Next.js'] },
  { id: 'demo2', name: '林雅婷', years: 3, city: '深圳', score: 74, skills: ['Vue', 'Node.js', 'Python'] },
  { id: 'demo3', name: '王浩然', years: 8, city: '北京', score: 93, skills: ['React', 'TypeScript', 'Rust'] },
];

export default function Marketing() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{
        height: 64, borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 48px', gap: 40,
        maxWidth: 1440, margin: '0 auto',
      }}>
        <SiftLogo />
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <a style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}>产品</a>
          <a style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}>案例</a>
          <a style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}>定价</a>
          <a style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}>文档</a>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <ThemeToggle />
          <Btn size="sm">登录</Btn>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <Btn size="sm" variant="primary">免费试用</Btn>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '96px 48px 64px', maxWidth: 1200, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 12px', borderRadius: 999,
          border: '1px solid var(--border)', background: 'var(--bg-elevated)',
          fontSize: 12, color: 'var(--fg-muted)', marginBottom: 24,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--success-500)' }} />
          正在开放 2026 Q2 新版内测
        </div>
        <h1 style={{
          fontSize: 64, fontWeight: 600, letterSpacing: '-0.02em',
          lineHeight: 1.05, color: 'var(--fg)', margin: 0,
          maxWidth: 900, marginInline: 'auto',
        }}>
          让简历筛选<br />
          <span style={{ color: 'var(--accent)' }}>更深思熟虑</span>
        </h1>
        <p style={{
          fontSize: 18, color: 'var(--fg-muted)', lineHeight: 1.55,
          maxWidth: 580, margin: '24px auto 0',
        }}>
          Sift 让 HR 从机械扫描中抽身。AI 为你读懂每一份简历、理解每一位候选人,<br />把决策交还给决策者。
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 36 }}>
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <Btn variant="primary" size="lg" icon={<I.ArrowR />}>开始免费试用</Btn>
          </Link>
          <Btn size="lg">观看 2 分钟演示</Btn>
        </div>
        <div style={{
          fontSize: 12, color: 'var(--fg-subtle)', marginTop: 16,
          fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>无需信用卡 · 14 天完整功能</div>

        {/* Hero visual: floating dashboard preview */}
        <div style={{ marginTop: 64, position: 'relative' }}>
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 16, boxShadow: 'var(--shadow-3)',
            padding: 24, textAlign: 'left', maxWidth: 960, margin: '0 auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>高级前端工程师</span>
              <Badge tone="accent">87 人已分析</Badge>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 16 }}>
              {DEMO_CANDIDATES.map((c) => (
                <div key={c.id} style={{
                  padding: 14, border: '1px solid var(--border)', borderRadius: 10,
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={c.name} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{c.years}年 · {c.city}</div>
                    </div>
                    <ScoreRing score={c.score} size={44} />
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {c.skills.slice(0, 3).map((s) => <SkillTag key={s}>{s}</SkillTag>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section style={{ padding: '64px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {[
            { icon: <I.Upload />,    title: '批量上传', desc: '拖拽即可解析。SSE 流式返回,5 份简历 10 秒出结果。' },
            { icon: <I.Sparkles />,  title: 'AI 提取', desc: '结构化基本信息、教育、工作、技能、项目经历。' },
            { icon: <I.Target />,    title: 'JD 匹配', desc: '技能 · 经验 · 教育三维度评分,附 AI 评语。' },
            { icon: <I.Compare />,   title: '并排对比', desc: '2–3 人并排,一眼识别最契合的候选人。' },
          ].map((f) => (
            <div key={f.title}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'var(--accent-bg-subtle)', color: 'var(--accent-500)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {React.cloneElement(f.icon, { size: 20 })}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '14px 0 6px', color: 'var(--fg)' }}>{f.title}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--fg-muted)', margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '32px 48px',
        fontSize: 12, color: 'var(--fg-subtle)',
        display: 'flex', justifyContent: 'space-between',
        maxWidth: 1440, margin: '0 auto',
      }}>
        <span>© 2026 Sift · 思筛</span>
        <span>hello@sift.hr</span>
      </footer>
    </div>
  );
}
