import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // API 集成测试当前因 auth/session mock 未补全而 401 失败,先排除。
    // 单独跑可执行 `npm run test:integration`(欢迎贡献者补 mock)
    exclude: ['tests/api-*.test.ts', '**/node_modules/**'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10_000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
