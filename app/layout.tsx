import type { Metadata } from 'next';
import Script from 'next/script';
import AntdRegistry from '@/components/AntdRegistry';
import AntdThemeProvider from '@/components/AntdThemeProvider';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const DESCRIPTION =
  'AI 驱动的简历筛选与岗位匹配平台:PDF 流式解析、技能/经验/教育三维度 JD 匹配评分、多人雷达图对比。开源、可自部署、简历数据不出本地。';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Sift · 思筛 — AI 简历筛选与岗位匹配', template: '%s · Sift 思筛' },
  description: DESCRIPTION,
  applicationName: 'Sift 思筛',
  keywords: ['简历筛选', 'AI 招聘', '岗位匹配', '简历解析', 'JD 匹配', 'HR 工具', 'resume screening', '开源'],
  icons: { icon: '/assets/logo-mark.svg' },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: 'Sift 思筛',
    title: 'Sift · 思筛 — AI 简历筛选与岗位匹配',
    description: DESCRIPTION,
    images: [{ url: '/screenshots/dashboard.png', alt: 'Sift 候选人列表' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sift · 思筛 — AI 简历筛选与岗位匹配',
    description: DESCRIPTION,
    images: ['/screenshots/dashboard.png'],
  },
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
