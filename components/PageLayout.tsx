'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Layout, Menu, Button, Dropdown, Avatar as AntAvatar } from 'antd';
import {
  UploadOutlined, TeamOutlined, BankOutlined, DiffOutlined,
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons';
import { SiftLogo } from './ui';
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
  activeKey?: string;
  contentStyle?: React.CSSProperties;
};

export default function PageLayout({
  children, title, subtitle, headerRight, user, activeKey, contentStyle,
}: PageLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem('sift-sider-collapsed');
      if (v !== null) setCollapsed(v === '1');
    } catch {}
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('sift-sider-collapsed', next ? '1' : '0'); } catch {}
  };

  const selectedKey =
    activeKey ??
    (NAV_ITEMS.find(n => pathname === n.key || pathname.startsWith(n.key + '/'))?.key ?? '');

  const displayName = user.displayName ?? user.username ?? '用户';

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        const f = document.createElement('form');
        f.method = 'POST';
        f.action = '/api/auth/logout';
        document.body.appendChild(f);
        f.submit();
      },
    },
  ];

  return (
    <Layout style={{ height: '100vh' }}>
      {/* ── Sider ── */}
      <Sider
        width={216}
        collapsedWidth={56}
        collapsed={collapsed}
        trigger={null}
        style={{ background: 'var(--bg)', borderRight: '1px solid var(--border)' }}
      >
        {/* Flex column wrapper to fill sider height */}
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

          {/* Logo */}
          <div style={{
            height: 64,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            padding: collapsed ? '0 16px' : '0 20px',
            borderBottom: '1px solid var(--border)',
            overflow: 'hidden',
            transition: 'padding 0.2s',
          }}>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <SiftLogo showWord={!collapsed} />
            </Link>
          </div>

          {/* Nav menu */}
          <div style={{ flex: 1, overflow: 'hidden auto' }}>
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              inlineCollapsed={collapsed}
              items={NAV_ITEMS.map(n => ({ key: n.key, icon: n.icon, label: n.label }))}
              style={{ border: 'none', background: 'transparent' }}
              onClick={({ key }) => router.push(key)}
            />
          </div>

          {/* Bottom: user info + collapse trigger */}
          <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            {/* User row */}
            <Dropdown menu={{ items: userMenuItems }} placement="topLeft" trigger={['click']}>
              <div style={{
                padding: collapsed ? '12px 0' : '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                justifyContent: collapsed ? 'center' : 'flex-start',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <AntAvatar
                  size={30}
                  style={{
                    background: 'var(--accent-bg-subtle)',
                    color: 'var(--accent-700)',
                    fontWeight: 600,
                    flexShrink: 0,
                    fontSize: 13,
                  }}
                >
                  {displayName[0].toUpperCase()}
                </AntAvatar>
                {!collapsed && (
                  <span style={{
                    fontSize: 13,
                    fontWeight: 500,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {displayName}
                  </span>
                )}
              </div>
            </Dropdown>

            {/* Collapse toggle */}
            <div style={{
              borderTop: '1px solid var(--border)',
              padding: '6px 8px',
              display: 'flex',
              justifyContent: collapsed ? 'center' : 'flex-end',
            }}>
              <Button
                type="text"
                size="small"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={toggle}
                style={{ color: 'rgba(0,0,0,0.4)' }}
              />
            </div>
          </div>
        </div>
      </Sider>

      {/* ── Main area ── */}
      <Layout>
        {/* Header */}
        <Header style={{
          height: 64,
          lineHeight: 1,
          padding: '0 24px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 12, opacity: 0.45, lineHeight: 1, marginTop: 2 }}>
                {subtitle}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {headerRight}
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
