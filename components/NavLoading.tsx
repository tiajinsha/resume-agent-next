'use client';
// 通用路由切换骨架屏 — 视觉上模拟 PageLayout 的 Sider+Header+Content 结构
// 让 loading.tsx 期间用户看到 "形状对" 的占位,而不是空白
import React from 'react';

const PULSE_KEYFRAMES = `
@keyframes nav-loading-pulse {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 0.85; }
}
`;

const Bar = ({ width, height = 14, mt = 0 }: { width: number | string; height?: number; mt?: number }) => (
  <div
    style={{
      width, height,
      borderRadius: 4,
      background: 'var(--neutral-200, #ebebeb)',
      animation: 'nav-loading-pulse 1.4s ease-in-out infinite',
      marginTop: mt,
    }}
  />
);

export default function NavLoading({ variant = 'list' }: { variant?: 'list' | 'detail' | 'grid' }) {
  return (
    <div style={{ height: '100vh', display: 'flex', background: 'var(--bg-sunken, #f0f2f5)' }}>
      <style>{PULSE_KEYFRAMES}</style>

      {/* Sider mock */}
      <aside style={{
        width: 216, flexShrink: 0,
        background: 'var(--bg, #fff)',
        borderRight: '1px solid var(--border, #f0f0f0)',
        padding: '20px 16px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <Bar width={140} height={20} />
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Bar key={i} width="100%" height={36} />
          ))}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header mock */}
        <header style={{
          height: 64, flexShrink: 0,
          background: 'var(--bg, #fff)',
          borderBottom: '1px solid var(--border, #f0f0f0)',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Bar width={120} height={16} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
            <Bar width={220} height={32} />
            <Bar width={32} height={32} />
            <Bar width={32} height={32} />
          </div>
        </header>

        {/* Content (varies by route shape) */}
        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          {variant === 'list' && (
            <>
              {/* KPI strip */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ flex: 1, padding: 18, background: '#fff', borderRadius: 8, border: '1px solid var(--border, #f0f0f0)' }}>
                    <Bar width={80} height={11} />
                    <Bar width={60} height={28} mt={10} />
                    <Bar width={100} height={11} mt={8} />
                  </div>
                ))}
              </div>
              {/* Table card */}
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--border, #f0f0f0)', padding: 16 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <Bar width={300} height={32} />
                  <Bar width={100} height={32} />
                  <Bar width={70} height={32} />
                </div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderTop: i ? '1px solid var(--border, #f0f0f0)' : 'none' }}>
                    <Bar width={32} height={32} />
                    <Bar width={120} height={14} />
                    <Bar width={100} height={14} />
                    <Bar width={140} height={14} />
                    <div style={{ marginLeft: 'auto' }}><Bar width={36} height={36} /></div>
                  </div>
                ))}
              </div>
            </>
          )}

          {variant === 'detail' && (
            <div style={{ display: 'flex', gap: 16, height: '100%' }}>
              <div style={{ width: 360, background: '#fff', borderRadius: 8, border: '1px solid var(--border, #f0f0f0)', padding: 16 }}>
                <Bar width="60%" height={18} />
                <Bar width="100%" height={300} mt={14} />
                <Bar width="80%" height={14} mt={12} />
                <Bar width="40%" height={14} mt={6} />
              </div>
              <div style={{ flex: 1, background: '#fff', borderRadius: 8, border: '1px solid var(--border, #f0f0f0)', padding: 24 }}>
                <Bar width="50%" height={24} />
                <Bar width="30%" height={14} mt={8} />
                <Bar width="100%" height={1} mt={20} />
                <Bar width="100%" height={14} mt={20} />
                <Bar width="92%" height={14} mt={8} />
                <Bar width="86%" height={14} mt={8} />
                <Bar width="100%" height={14} mt={20} />
                <Bar width="78%" height={14} mt={8} />
                <Bar width="64%" height={14} mt={8} />
              </div>
            </div>
          )}

          {variant === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--border, #f0f0f0)', padding: 16 }}>
                  <Bar width="60%" height={18} />
                  <Bar width="40%" height={12} mt={6} />
                  <Bar width="100%" height={1} mt={14} />
                  <Bar width="100%" height={14} mt={14} />
                  <Bar width="80%" height={14} mt={6} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
