import type { Metadata } from 'next';
import Script from 'next/script';
import AntdRegistry from '@/components/AntdRegistry';
import AntdThemeProvider from '@/components/AntdThemeProvider';
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
      <head />
      <body>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <AntdRegistry>
          <AntdThemeProvider>
            {children}
          </AntdThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
