'use client';
// 通用设计系统组件(移植自 sift-design-system/ui_kits/_shared/components.jsx)
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { I } from './icons';

// ---------- Logo ----------
type SiftLogoProps = { size?: number; showWord?: boolean };
export const SiftLogo = ({ size = 24, showWord = true }: SiftLogoProps) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <g transform="translate(4,4)">
        <rect x="0" y="0" width="24" height="4" rx="2" fill="currentColor" />
        <rect x="4" y="10" width="16" height="4" rx="2" fill="currentColor" />
        <rect x="8" y="20" width="8" height="4" rx="2" fill="currentColor" />
      </g>
    </svg>
    {showWord && (
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--fg)' }}>
        Sift <span style={{ opacity: 0.5, fontWeight: 500 }}>思筛</span>
      </span>
    )}
  </div>
);

// ---------- Button ----------
type BtnProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactElement<{ size?: number }>;
  children?: React.ReactNode;
  style?: React.CSSProperties;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Btn = ({ variant = 'secondary', size = 'md', icon, children, style, ...rest }: BtnProps) => {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    border: '1px solid transparent',
    borderRadius: 8,
    fontFamily: 'var(--font-sans)', fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--dur-fast) var(--ease-sift)',
    whiteSpace: 'nowrap',
  };
  const sizes = {
    sm: { padding: '5px 10px', fontSize: 12 },
    md: { padding: '8px 14px', fontSize: 13 },
    lg: { padding: '11px 18px', fontSize: 14 },
  };
  const variants = {
    primary:   { background: 'var(--accent)', color: 'var(--accent-fg)' },
    secondary: { background: 'var(--bg-elevated)', color: 'var(--fg)', borderColor: 'var(--border)' },
    ghost:     { background: 'transparent', color: 'var(--fg)' },
    danger:    { background: 'var(--danger-500)', color: 'white' },
  };
  return (
    <button style={{ ...base, ...sizes[size], ...variants[variant], ...style }} {...rest}>
      {icon && React.cloneElement(icon, { size: size === 'sm' ? 14 : 16 })}
      {children}
    </button>
  );
};

// ---------- Badge ----------
type BadgeProps = {
  tone?: 'neutral' | 'info' | 'warn' | 'success' | 'danger' | 'accent';
  dot?: boolean;
  children?: React.ReactNode;
};

export const Badge = ({ tone = 'neutral', dot, children }: BadgeProps) => {
  const tones: Record<string, { bg: string; fg: string; border?: string; dotColor: string }> = {
    neutral: { bg: 'var(--bg-sunken)', fg: 'var(--fg-muted)', border: '1px solid var(--border)', dotColor: 'var(--fg-subtle)' },
    info:    { bg: 'var(--info-100)', fg: 'var(--info-700)', dotColor: 'var(--info-500)' },
    warn:    { bg: 'var(--warn-100)', fg: 'var(--warn-700)', dotColor: 'var(--warn-500)' },
    success: { bg: 'var(--success-100)', fg: 'var(--success-700)', dotColor: 'var(--success-500)' },
    danger:  { bg: 'var(--danger-100)', fg: 'var(--danger-700)', dotColor: 'var(--danger-500)' },
    accent:  { bg: 'var(--accent-bg-subtle)', fg: 'var(--accent-700)', dotColor: 'var(--accent-500)' },
  };
  const t = tones[tone];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: t.bg, color: t.fg, border: t.border || 'none' }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: t.dotColor }} />}
      {children}
    </span>
  );
};

// ---------- SkillTag ----------
type SkillTagProps = { variant?: 'default' | 'strong' | 'muted'; strong?: boolean; children?: React.ReactNode };
export const SkillTag = ({ variant, strong, children }: SkillTagProps) => {
  const v = variant ?? (strong ? 'strong' : 'default');
  const styles = {
    default: { bg: 'var(--bg-sunken)',       fg: 'var(--fg-muted)',   border: 'var(--border)' },
    strong:  { bg: 'var(--accent-bg-subtle)', fg: 'var(--accent-700)', border: 'var(--accent-300)' },
    muted:   { bg: 'transparent',            fg: 'var(--fg-subtle)',  border: 'var(--border)' },
  }[v];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
      background: styles.bg, color: styles.fg,
      border: '1px solid ' + styles.border,
    }}>{children}</span>
  );
};

// ---------- SchoolTierBadge ----------
type SchoolTier = '985' | '211' | '一本' | '二本' | '三本' | '大专';
type SchoolTierBadgeProps = { tier?: SchoolTier | null };
export const SchoolTierBadge = ({ tier }: SchoolTierBadgeProps) => {
  if (!tier || tier === '大专') return null;
  const styles: Record<SchoolTier, { bg: string; fg: string; border: string }> = {
    '985': { bg: 'var(--warn-100)',         fg: 'var(--warn-700)',   border: 'var(--warn-300)'   },
    '211': { bg: 'var(--info-100)',         fg: 'var(--info-700)',   border: 'var(--info-300)'   },
    '一本': { bg: 'var(--accent-bg-subtle)', fg: 'var(--accent-700)', border: 'var(--accent-300)' },
    '二本': { bg: 'var(--bg-sunken)',        fg: 'var(--fg-muted)',   border: 'var(--border)'     },
    '三本': { bg: 'var(--bg-sunken)',        fg: 'var(--fg-subtle)',  border: 'var(--border)'     },
    '大专': { bg: 'var(--bg-sunken)',        fg: 'var(--fg-subtle)',  border: 'var(--border)'     },
  };
  const s = styles[tier];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: 4,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      background: s.bg, color: s.fg, border: '1px solid ' + s.border,
    }}>{tier}</span>
  );
};

// ---------- Status pill ----------
export const STATUSES = {
  '待筛选': 'neutral',
  '初筛通过': 'info',
  '面试中': 'warn',
  '已录用': 'success',
  '已淘汰': 'danger',
} as const;

type StatusPillProps = { status: '待筛选' | '初筛通过' | '面试中' | '已录用' | '已淘汰' };
export const StatusPill = ({ status }: StatusPillProps) => <Badge tone={STATUSES[status] || 'neutral'} dot>{status}</Badge>;

// ---------- Avatar ----------
type AvatarProps = { name?: string | null; size?: number };
export const Avatar = ({ name, size = 32 }: AvatarProps) => {
  const initial = (name || '?').charAt(0);
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: 'var(--accent-bg-subtle)', color: 'var(--accent-700)',
      fontFamily: 'var(--font-sans)', fontSize: size * 0.42, fontWeight: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>{initial}</div>
  );
};

// ---------- Card ----------
type CardProps = {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  hover?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ children, style, hover, ...rest }, ref) => (
  <div ref={ref} style={{
    background: 'var(--bg-elevated)',
    border: '1px solid ' + (hover ? 'var(--accent-300)' : 'var(--border)'),
    borderRadius: 12,
    boxShadow: hover ? 'var(--shadow-2)' : 'var(--shadow-1)',
    transition: 'all var(--dur-fast) var(--ease-sift)',
    ...style,
  }} {...rest}>{children}</div>
));
Card.displayName = 'Card';

// ---------- Input ----------
type InputProps = {
  icon?: React.ReactElement<{ size?: number }>;
  style?: React.CSSProperties;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ icon, style, ...rest }: InputProps) => (
  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    {icon && <span style={{ position: 'absolute', left: 12, color: 'var(--fg-subtle)', display: 'flex', pointerEvents: 'none' }}>{React.cloneElement(icon, { size: 16 })}</span>}
    <input style={{
      width: '100%',
      padding: icon ? '9px 12px 9px 36px' : '9px 12px',
      borderRadius: 8,
      border: '1px solid var(--border)',
      background: 'var(--bg-elevated)',
      fontFamily: 'var(--font-sans)', fontSize: 14,
      color: 'var(--fg)',
      outline: 'none',
      ...style,
    }}
      onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = 'var(--shadow-focus)'; }}
      onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
      {...rest}
    />
  </div>
);

// ---------- Score ring ----------
type ScoreRingProps = { score?: number; size?: number; label?: string };
export const ScoreRing = ({ score = 0, size = 72, label }: ScoreRingProps) => {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  const scoreColor = score >= 80 ? 'var(--score-100)' : score >= 65 ? 'var(--score-80)' : score >= 50 ? 'var(--score-60)' : score >= 30 ? 'var(--score-40)' : 'var(--score-0)';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-sunken)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset var(--dur-slow) var(--ease-sift)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: size * 0.28, fontWeight: 600, color: scoreColor, fontFeatureSettings: "'tnum'" }}>{Math.round(score)}</span>
        {label && <span style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>}
      </div>
    </div>
  );
};

// ---------- Theme hook ----------
export const useTheme = (): [string, (t: string) => void] => {
  const [theme, setTheme] = useState<string>(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.dataset.theme || 'light';
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('sift-theme', theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, setTheme];
};

export const ThemeToggle = () => {
  const [theme, setTheme] = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 8,
        border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--fg)',
        cursor: 'pointer',
      }}
      aria-label="切换主题"
    >
      {theme === 'dark' ? <I.Sun size={16} /> : <I.Moon size={16} />}
    </button>
  );
};

// ---------- App shell: sidebar + top bar ----------
const SIDEBAR_ITEMS = [
  { id: 'upload',    label: '上传解析', icon: <I.Upload />,    to: '/upload' },
  { id: 'dashboard', label: '候选人',   icon: <I.Users />,     to: '/dashboard' },
  { id: 'jd',        label: '岗位 JD',  icon: <I.Briefcase />, to: '/jd' },
  { id: 'compare',   label: '对比分析', icon: <I.Compare />,   to: '/compare' },
];

type SidebarProps = {
  active?: string;
  counts?: Partial<Record<string, number>>;
  user?: { displayName?: string | null; username: string } | null;
};
export const Sidebar = ({ active = 'dashboard', counts, user }: SidebarProps) => {
  const pathname = usePathname();
  return (
    <aside style={{
      width: 220, background: 'var(--bg)',
      borderRight: '1px solid var(--border)',
      padding: '16px 12px',
      display: 'flex', flexDirection: 'column', gap: 12,
      flexShrink: 0, height: '100%',
    }}>
      <div style={{ padding: '4px 8px' }}>
        <Link href="/" style={{ textDecoration: 'none' }}><SiftLogo /></Link>
      </div>
      <div style={{ padding: '0 4px' }}>
        <Link href="/upload" style={{ textDecoration: 'none', display: 'block' }}>
          <Btn variant="primary" size="sm" icon={<I.Plus />} style={{ width: '100%', justifyContent: 'center' }}>新建任务</Btn>
        </Link>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = item.id === active || pathname === item.to;
          const count = counts?.[item.id];
          const content = (
            <>
              {React.cloneElement(item.icon, { size: 16 })}
              <span style={{ flex: 1 }}>{item.label}</span>
              {count != null && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: isActive ? 'var(--accent-600)' : 'var(--fg-subtle)',
                  background: isActive ? 'transparent' : 'var(--bg-sunken)',
                  padding: '1px 6px', borderRadius: 999,
                }}>{count}</span>
              )}
            </>
          );
          const css: React.CSSProperties = {
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 8, border: 'none',
            background: isActive ? 'var(--accent-bg-subtle)' : 'transparent',
            color: isActive ? 'var(--accent-700)' : 'var(--fg)',
            fontFamily: 'var(--font-sans)', fontSize: 13,
            fontWeight: isActive ? 600 : 500,
            cursor: 'pointer', textAlign: 'left', textDecoration: 'none', width: '100%',
          };
          return (
            <Link key={item.id} href={item.to} style={css}>{content}</Link>
          );
        })}
      </nav>
      <div style={{
        marginTop: 'auto', padding: '8px 10px',
        display: 'flex', alignItems: 'center', gap: 8,
        borderTop: '1px solid var(--border)', paddingTop: 12,
      }}>
        <Avatar name={(user?.displayName ?? user?.username ?? '?')[0].toUpperCase()} size={28} />
        <div style={{ fontSize: 12, flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--fg)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.displayName ?? user?.username ?? '用户'}
          </div>
        </div>
        <form action="/api/auth/logout" method="POST" style={{ flexShrink: 0 }}>
          <button type="submit" title="退出登录" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--fg-subtle)', cursor: 'pointer' }}>
            <I.LogOut size={14} />
          </button>
        </form>
      </div>
    </aside>
  );
};

type TopBarProps = { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode };
export const TopBar = ({ title, subtitle, right }: TopBarProps) => (
  <div style={{
    height: 60, borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center',
    padding: '0 24px', gap: 16,
    background: 'var(--bg)', flexShrink: 0,
  }}>
    <div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600,
        letterSpacing: '-0.01em', color: 'var(--fg)',
      }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>{subtitle}</div>}
    </div>
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
      {right}
      <button type="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--fg-subtle)', cursor: 'pointer' }} aria-label="通知">
        <I.Bell size={16} />
      </button>
      <ThemeToggle />
    </div>
  </div>
);
