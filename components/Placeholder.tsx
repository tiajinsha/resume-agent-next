// components/Placeholder.tsx
'use client';
import Link from 'next/link';
import { Sidebar, TopBar, Card, Btn } from './ui';
import { I } from './icons';

export default function Placeholder({ title, sidebarActive, description }: {
  title: string;
  sidebarActive: string;
  description: string;
}) {
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 44px)', background: 'var(--bg-sunken)' }}>
      <Sidebar active={sidebarActive} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar title={title} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Card style={{ padding: 48, maxWidth: 480, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-bg-subtle)', color: 'var(--accent-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <I.Sparkles size={24} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>即将上线</div>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6, margin: '0 0 20px' }}>{description}</p>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <Btn variant="secondary" icon={<I.ChevL />}>返回候选人列表</Btn>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
