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
          // Do NOT override colorBgContainer / colorBgLayout here —
          // dark algorithm needs to generate them freely.
          // antd defaults already match: light=>#ffffff / #f0f2f5, dark=>#1f1f1f / #141414
          borderRadius: 6,
          borderRadiusLG: 8,
          fontSize: 14,
          fontFamily:
            "'Geist', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
        },
        components: {
          Layout: {
            headerHeight: 64,
          },
          Menu: {
            itemHeight: 42,
          },
          Button: { borderRadius: 6 },
          Input: { borderRadius: 6 },
          Select: { borderRadius: 6 },
          Card: { borderRadius: 8 },
          Table: { borderRadius: 8 },
          Drawer: { borderRadius: 0 },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
