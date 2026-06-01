'use client';
// 落地页 — 产品价值 + 开源展示(混合定位)
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SiftLogo, ThemeToggle } from '@/components/ui';
import { I } from '@/components/icons';

const GITHUB = 'https://github.com/tiajinsha/resume-agent-next';

// GitHub mark — 图标库未含,内联标准 SVG
const GithubIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

// 滚动揭示;无 IntersectionObserver 时直接显示(SSR / 老浏览器兜底)
function useReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { el.classList.add('is-visible'); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { el.classList.add('is-visible'); io.disconnect(); }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useReveal();
  return <div ref={ref} className={`lp-reveal ${className}`} style={style}>{children}</div>;
}

// 浏览器框裱真实截图 — 全页截图唯一出口
function BrowserFrame({ src, alt, addr, eager }: { src: string; alt: string; addr: string; eager?: boolean }) {
  return (
    <div className="lp-browser">
      <div className="lp-browser-bar">
        <span className="lp-browser-dots">
          <span className="lp-browser-dot" /><span className="lp-browser-dot" /><span className="lp-browser-dot" />
        </span>
        <span className="lp-browser-addr">{addr}</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="lp-shot" src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} />
    </div>
  );
}

function Feature({ icon, eyebrow, title, desc, shot, alt, addr, reverse }: {
  icon: React.ReactNode; eyebrow: string; title: string; desc: string;
  shot: string; alt: string; addr: string; reverse?: boolean;
}) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`lp-feature lp-reveal${reverse ? ' reverse' : ''}`}>
      <div className="lp-feature-media"><BrowserFrame src={shot} alt={alt} addr={addr} /></div>
      <div>
        <span className="lp-feature-icon">{icon}</span>
        <p className="lp-eyebrow" style={{ marginTop: 16 }}>{eyebrow}</p>
        <h3 className="lp-feature-title">{title}</h3>
        <p className="lp-feature-desc">{desc}</p>
      </div>
    </div>
  );
}

export default function Marketing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* ── Nav ── */}
      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="lp-section lp-nav-inner">
          <SiftLogo />
          <div className="lp-nav-links">
            <a href="#features">特性</a>
            <a href="#how">工作流程</a>
            <a href="#opensource">开源</a>
          </div>
          <div className="lp-nav-right">
            <ThemeToggle />
            <Link href="/login" className="lp-btn lp-btn-ghost">登录</Link>
            <a href={GITHUB} target="_blank" rel="noreferrer" className="lp-btn lp-btn-primary" aria-label="在 GitHub 查看源码">
              <GithubIcon /> GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="lp-hero">
        <div className="lp-section lp-hero-inner" style={{ paddingBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span className="lp-chip">
              <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--success-500)', display: 'inline-block' }} />
              开源项目 · MIT License
            </span>
          </div>
          <h1 className="lp-hero-title">
            让简历筛选<br /><span style={{ color: 'var(--accent)' }}>更深思熟虑</span>
          </h1>
          <p className="lp-hero-sub">
            AI 读懂每一份简历,30 秒筛完一摞,把决策权交还给你。开源、可自部署,简历数据不出本地。
          </p>
          <div className="lp-hero-cta">
            <Link href="/login" className="lp-btn lp-btn-primary lp-btn-lg">免费试用 <I.ArrowR size={18} /></Link>
            <a href={GITHUB} target="_blank" rel="noreferrer" className="lp-btn lp-btn-ghost lp-btn-lg"><GithubIcon size={18} /> GitHub 源码</a>
          </div>
          <div className="lp-hero-trust">
            <span>✓ 开源免费</span>
            <span>✓ 本地部署</span>
            <span>✓ 数据自控</span>
          </div>
          <div className="lp-hero-figure">
            <BrowserFrame src="/screenshots/dashboard.png" alt="Sift 候选人列表:KPI 卡片、状态筛选、批量操作" addr="sift · 候选人列表" eager />
          </div>
        </div>
      </header>

      {/* ── 技术栈信任条 ── */}
      <section style={{ padding: '56px 0 0' }}>
        <div className="lp-section">
          <Reveal>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--fg-subtle)', margin: 0, letterSpacing: '0.02em' }}>
              基于现代全栈技术构建
            </p>
            <div className="lp-chips" style={{ marginTop: 18 }}>
              {['Next.js 16', 'React 19', 'TypeScript', 'DeepSeek', 'SQLite', 'antd v6'].map((t) => (
                <span key={t} className="lp-chip">{t}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 特性 zigzag ── */}
      <section id="features" className="lp-block lp-anchor">
        <div className="lp-section">
          <Reveal className="lp-section-head">
            <p className="lp-eyebrow">核心特性</p>
            <h2 className="lp-section-title">为招聘的每一步省下时间</h2>
            <p className="lp-section-sub">从读简历到做决策,AI 全程帮你提速。</p>
          </Reveal>

          <Feature
            icon={<I.Sparkles size={22} />}
            eyebrow="实时抽取"
            title="AI 流式解析,像看 AI 思考"
            desc="上传 PDF,AI 像打字机一样把姓名、教育、工作、项目、技能逐字解析出来。整个过程实时可见,刷新页面也能秒级追上当前进度。"
            shot="/screenshots/detail.png"
            alt="候选人详情:AI 流式抽取与 JD 匹配抽屉"
            addr="sift · 候选人详情"
          />
          <Feature
            reverse
            icon={<I.Target size={22} />}
            eyebrow="智能匹配"
            title="技能 · 经验 · 教育,三维度打分"
            desc="按你定义的岗位要求,从三个维度独立评分并给出 AI 评语,再按你设定的权重算出综合分。哪些必备技能没满足,一目了然。"
            shot="/screenshots/jd.png"
            alt="岗位描述编辑:必备技能、加分项、三维度权重配置"
            addr="sift · 岗位匹配"
          />
          <Feature
            icon={<I.Compare size={22} />}
            eyebrow="并排对比"
            title="多人对比 + 自研雷达图"
            desc="把 2–3 位候选人放在一起比较,自研 SVG 雷达图直观呈现能力差异,自动高亮岗位必备技能与每个人的独有亮点。"
            shot="/screenshots/compare.png"
            alt="多人对比:雷达图、维度评分、技能差异高亮"
            addr="sift · 多人对比"
          />
        </div>
      </section>

      {/* ── 工作流程 ── */}
      <section id="how" className="lp-block lp-anchor" style={{ background: 'var(--bg-sunken)' }}>
        <div className="lp-section">
          <Reveal className="lp-section-head">
            <p className="lp-eyebrow">工作流程</p>
            <h2 className="lp-section-title">三步,从一摞 PDF 到一个决定</h2>
          </Reveal>
          <Reveal className="lp-steps">
            {[
              { n: '1', t: '上传简历', d: '拖拽 PDF 即可,支持一次批量上传多份。' },
              { n: '2', t: 'AI 解析', d: '流式抽取结构化信息,并对项目经历做价值评估。' },
              { n: '3', t: '对比决策', d: 'JD 打分加多人对比,快速锁定最值得见的人。' },
            ].map((s) => (
              <div key={s.n}>
                <span className="lp-step-num">{s.n}</span>
                <h3 className="lp-step-title">{s.t}</h3>
                <p className="lp-step-desc">{s.d}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── 开源 · 自部署 ── */}
      <section id="opensource" className="lp-block lp-anchor">
        <div className="lp-section">
          <Reveal className="lp-cta-card">
            <p className="lp-eyebrow">开源 · 自部署 · 数据自控</p>
            <h2 className="lp-section-title" style={{ marginBottom: 14 }}>你的简历数据,留在你自己的服务器</h2>
            <p className="lp-section-sub" style={{ maxWidth: 640, margin: '0 auto 24px' }}>
              Sift 以 MIT 协议完整开源。一条命令用 Docker 部署到自己的机器,所有简历数据全程留在本地,不经过任何第三方服务。
            </p>
            <div><code className="lp-code">docker compose up -d --build</code></div>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
              <a href={GITHUB} target="_blank" rel="noreferrer" className="lp-btn lp-btn-primary"><GithubIcon /> 查看 GitHub</a>
              <a href={`${GITHUB}#-部署`} target="_blank" rel="noreferrer" className="lp-btn lp-btn-ghost">阅读部署文档</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 尾部 CTA ── */}
      <section className="lp-block" style={{ paddingTop: 0 }}>
        <div className="lp-section" style={{ textAlign: 'center' }}>
          <Reveal>
            <h2 className="lp-section-title" style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>把筛简历的时间还给你</h2>
            <p className="lp-section-sub" style={{ margin: '0 auto 32px' }}>开源免费,5 分钟跑起来。</p>
            <div className="lp-hero-cta" style={{ marginTop: 0 }}>
              <Link href="/login" className="lp-btn lp-btn-primary lp-btn-lg">免费试用 <I.ArrowR size={18} /></Link>
              <a href={GITHUB} target="_blank" rel="noreferrer" className="lp-btn lp-btn-ghost lp-btn-lg"><GithubIcon size={18} /> GitHub 源码</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-section">
          <div className="lp-footer-inner">
            <SiftLogo />
            <div className="lp-footer-links">
              <a href={GITHUB} target="_blank" rel="noreferrer">GitHub</a>
              <a href={`${GITHUB}#readme`} target="_blank" rel="noreferrer">文档</a>
              <a href={`${GITHUB}/blob/main/LICENSE`} target="_blank" rel="noreferrer">MIT License</a>
            </div>
            <span style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>© 2026 Sift · 思筛</span>
          </div>
        </div>
      </footer>
    </>
  );
}
