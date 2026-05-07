import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // 降级若干规则为 warn —— 这些是后续要逐步清理的技术债,
  // 不应该阻塞 CI / 贡献者 PR
  {
    rules: {
      // antd / pdf-parse / openai SDK 边界处的合理 any,后续按 case 替换为精确类型
      "@typescript-eslint/no-explicit-any": "warn",
      // React 19 Compiler 新规则,需要重构 effect 模式后再启用
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/component-hook-factories": "warn",
      "react-hooks/static-components": "warn",
    },
  },
]);

export default eslintConfig;
