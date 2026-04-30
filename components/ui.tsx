'use client';
// UI component wrappers — antd v5/v6 thin wrappers keeping the legacy interface.
import React, { useState, useEffect } from 'react';
import { Button, Avatar as AntAvatar, Tag, Card as AntCard, Input as AntInput } from 'antd';
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
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'>;

export const Btn = ({ variant = 'secondary', size = 'md', icon, children, style, disabled, onClick, ...rest }: BtnProps) => {
  const antSize = size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'middle';
  let antType: 'primary' | 'default' | 'text' | 'dashed' | 'link' = 'default';
  let danger = false;
  if (variant === 'primary') antType = 'primary';
  else if (variant === 'ghost') antType = 'text';
  else if (variant === 'danger') { antType = 'primary'; danger = true; }

  const antIcon = icon ? React.cloneElement(icon, { size: size === 'sm' ? 14 : 16 }) : undefined;

  return (
    <Button
      type={antType}
      size={antSize}
      danger={danger}
      icon={antIcon}
      disabled={disabled}
      onClick={onClick as any}
      style={style}
    >
      {children}
    </Button>
  );
};

// ---------- Badge ----------
type BadgeProps = {
  tone?: 'neutral' | 'info' | 'warn' | 'success' | 'danger' | 'accent';
  dot?: boolean;
  children?: React.ReactNode;
};

const TONE_COLOR: Record<string, string> = {
  neutral: 'default',
  info:    'blue',
  warn:    'orange',
  success: 'green',
  danger:  'red',
  accent:  'purple',
};

export const Badge = ({ tone = 'neutral', dot, children }: BadgeProps) => {
  const color = TONE_COLOR[tone] ?? 'default';
  return (
    <Tag color={color} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: 999,
          background: 'currentColor', display: 'inline-block',
        }} />
      )}
      {children}
    </Tag>
  );
};

// ---------- SkillTag ----------
type SkillTagProps = { variant?: 'default' | 'strong' | 'muted'; strong?: boolean; children?: React.ReactNode };
export const SkillTag = ({ variant, strong, children }: SkillTagProps) => {
  const v = variant ?? (strong ? 'strong' : 'default');
  const colorMap = { default: undefined, strong: 'purple', muted: undefined };
  return (
    <Tag
      color={colorMap[v]}
      style={{ borderRadius: 999, fontSize: 12, fontWeight: 500 }}
    >
      {children}
    </Tag>
  );
};

// ---------- SchoolTierBadge ----------
type SchoolTier = '985' | '211' | '一本' | '二本' | '三本' | '大专';
type SchoolTierBadgeProps = { tier?: SchoolTier | null };
export const SchoolTierBadge = ({ tier }: SchoolTierBadgeProps) => {
  if (!tier || tier === '大专') return null;
  const colorMap: Record<SchoolTier, string> = {
    '985': 'gold',
    '211': 'blue',
    '一本': 'purple',
    '二本': 'default',
    '三本': 'default',
    '大专': 'default',
  };
  return <Tag color={colorMap[tier]} style={{ fontSize: 11, fontWeight: 600 }}>{tier}</Tag>;
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
type AvatarProps = { name?: string | null; size?: number; src?: string | null };
export const Avatar = ({ name, size = 32, src }: AvatarProps) => {
  const initial = (name || '?').charAt(0);
  if (src) {
    return (
      <AntAvatar
        size={size}
        src={src}
        style={{ flexShrink: 0, border: '1px solid var(--border)' }}
      />
    );
  }
  return (
    <AntAvatar
      size={size}
      style={{ background: 'var(--accent-bg-subtle)', color: 'var(--accent-700)', fontWeight: 600, flexShrink: 0 }}
    >
      {initial}
    </AntAvatar>
  );
};

// ---------- Card ----------
type CardProps = {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  hover?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ children, style, hover, onClick, onMouseEnter, onMouseLeave, ...rest }, ref) => (
  <AntCard
    ref={ref}
    styles={{ body: { padding: 0 } }}
    style={{
      border: hover ? '1px solid var(--accent-300)' : undefined,
      boxShadow: hover ? 'var(--shadow-2)' : undefined,
      ...style,
    }}
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    {...(rest as any)}
  >
    {children}
  </AntCard>
));
Card.displayName = 'Card';

// ---------- Input ----------
type InputProps = {
  icon?: React.ReactElement<{ size?: number }>;
  style?: React.CSSProperties;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>;

export const Input = ({ icon, style, onChange, value, placeholder, type, disabled, ...rest }: InputProps) => {
  const prefix = icon ? React.cloneElement(icon, { size: 16 }) : undefined;
  return (
    <AntInput
      prefix={prefix}
      style={style}
      placeholder={placeholder}
      value={value as string}
      onChange={onChange as any}
      type={type}
      disabled={disabled}
      {...(rest as any)}
    />
  );
};

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
  const [theme, setTheme] = useState<string>('light'); // SSR-safe default
  useEffect(() => {
    // Sync with persisted theme after hydration
    const stored = document.documentElement.dataset.theme || 'light';
    if (stored !== 'light') setTheme(stored);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('sift-theme', theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, setTheme];
};

export const ThemeToggle = () => {
  const [theme, setTheme] = useTheme();
  return (
    <Button
      type="text"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      icon={theme === 'dark' ? <I.Sun size={16} /> : <I.Moon size={16} />}
      style={{ width: 32, height: 32, padding: 0 }}
      aria-label="切换主题"
    />
  );
};

