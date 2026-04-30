'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Layout, Menu, Button } from 'antd';
import {
  UploadOutlined,
  TeamOutlined,
  BankOutlined,
  DiffOutlined,
  LogoutOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { SiftLogo, Avatar, ThemeToggle } from './ui';
import type { User } from '@/lib/db/schema';

const { Sider, Header, Content } = Layout;

const NAV_ITEMS = [
  { key: '/upload',    label: '上传解析', icon: <UploadOutlined /> },
  { key: '/dashboard', label: '候选人',   icon: <TeamOutlined /> },
  { key: '/jd',        label: '岗位 JD',  icon: <BankOutlined /> },
  { key: '/compare',   label: '对比分析', icon: <DiffOutlined /> },
];

type PageLayoutProps = {
  children: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;
  user: User;
  /** Override the active menu key (defaults to pathname match) */
  activeKey?: string;
  contentStyle?: React.CSSProperties;
};

export default function PageLayout({
  children,
  title,
  subtitle,
  headerRight,
  user,
  activeKey,
  contentStyle,
}: PageLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const selectedKey =
    activeKey ??
    (NAV_ITEMS.find((n) => pathname === n.key || pathname.startsWith(n.key + '/'))?.key ?? '');

  const menuItems = NAV_ITEMS.map((n) => ({
    key: n.key,
    icon: n.icon,
    label: <Link href={n.key} style={{ textDecoration: 'none' }}>{n.label}</Link>,
  }));

  return (
    <Layout style={{ height: 'calc(100vh - 44px)' }}>
      {/* ── Sider ── */}
      <Sider
        width={220}
        style={{ background: 'var(--bg)', borderRight: '1px solid var(--border)' }}
      >
        <div style={{ padding: '16px 16px 8px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <SiftLogo />
          </Link>
        </div>

        <div style={{ padding: '4px 12px 8px' }}>
          <Link href="/upload" style={{ textDecoration: 'none', display: 'block' }}>
            <Button type="primary" size="small" style={{ width: '100%' }}>
              + 新建任务
            </Button>
          </Link>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ border: 'none', background: 'var(--bg)', fontSize: 13 }}
          onClick={({ key }) => router.push(key)}
        />

        {/* User footer */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg)',
        }}>
          <Avatar name={(user.displayName ?? user.username ?? '?')[0].toUpperCase()} size={28} />
          <div style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--fg)', fontWeight: 500 }}>
            {user.displayName ?? user.username ?? '用户'}
          </div>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" title="退出登录" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--fg-subtle)', cursor: 'pointer' }}>
              <LogoutOutlined />
            </button>
          </form>
        </div>
      </Sider>

      {/* ── Main area ── */}
      <Layout>
        {/* Header */}
        <Header style={{
          height: 60,
          lineHeight: '60px',
          padding: '0 24px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18, fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--fg)',
              lineHeight: 1.2,
            }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', lineHeight: 1 }}>
                {subtitle}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {headerRight}
            <Button
              type="text"
              icon={<BellOutlined />}
              style={{ width: 32, height: 32, padding: 0 }}
              aria-label="通知"
            />
            <ThemeToggle />
          </div>
        </Header>

        {/* Content */}
        <Content style={{
          overflow: 'auto',
          background: 'var(--bg-sunken)',
          ...contentStyle,
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
