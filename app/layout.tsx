import type { Metadata } from 'next';
import AppChrome from '@/components/AppChrome';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sift · 思筛 — AI 简历筛选',
  icons: { icon: '/assets/logo-mark.svg' },
};

const THEME_INIT = `
  (function () {
    try {
      var t = localStorage.getItem('sift-theme');
      if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <AppChrome />
        <main className="app-shell">{children}</main>
      </body>
    </html>
  );
}
