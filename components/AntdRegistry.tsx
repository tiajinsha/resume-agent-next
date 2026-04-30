'use client';
import React, { useRef } from 'react';
import { StyleProvider, createCache, extractStyle } from '@ant-design/cssinjs';
import { useServerInsertedHTML } from 'next/navigation';

export default function AntdRegistry({ children }: { children: React.ReactNode }) {
  const cache = useRef(createCache());
  useServerInsertedHTML(() => (
    <style
      id="antd-server-side"
      dangerouslySetInnerHTML={{ __html: extractStyle(cache.current, true) }}
    />
  ));
  return <StyleProvider cache={cache.current}>{children}</StyleProvider>;
}
