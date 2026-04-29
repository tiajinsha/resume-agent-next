import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / CJS packages that should not be bundled by Next.js:
  // - better-sqlite3: native N-API addon (Task 5+)
  // - pdf-parse: CJS with debug-on-import side effects (Task 11+)
  serverExternalPackages: ["better-sqlite3", "pdf-parse"],
};

export default nextConfig;
