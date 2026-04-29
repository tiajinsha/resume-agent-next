// components/AppChrome.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle, SiftLogo } from './ui';

const NAV = [
  { to: '/',           label: '落地' },
  { to: '/upload',     label: '上传' },
  { to: '/dashboard',  label: '候选人' },
  { to: '/jd',         label: 'JD 评分' },
  { to: '/compare',    label: '对比' },
  { to: '/design',     label: '设计系统' },
];

export default function AppChrome() {
  const pathname = usePathname();
  return (
    <header className="app-chrome">
      <Link href="/" className="brand">
        <SiftLogo showWord={false} size={20} />
        <span className="brand-text">Sift<span className="cjk">思筛</span></span>
      </Link>
      <span className="divider" />
      <nav>
        {NAV.map((n) => {
          const isActive = n.to === '/' ? pathname === '/' : pathname.startsWith(n.to);
          return (
            <Link key={n.to} href={n.to} className={isActive ? 'active' : ''}>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <span className="spacer" />
      <ThemeToggle />
    </header>
  );
}
