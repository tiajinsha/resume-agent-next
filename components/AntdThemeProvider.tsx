'use client';
import React, { useState, useEffect } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';

export default function AntdThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Read initial theme
    const t = document.documentElement.dataset.theme;
    setIsDark(t === 'dark');

    // Watch for theme changes
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.dataset.theme === 'dark');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#7c5cbf',
          colorLink: '#7c5cbf',
          borderRadius: 8,
          fontFamily:
            "'Geist', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
        },
        components: {
          Button: { borderRadius: 8 },
          Input: { borderRadius: 8 },
          Select: { borderRadius: 8 },
          Card: { borderRadius: 12 },
          Table: { borderRadius: 12 },
          Drawer: { borderRadius: 0 },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
