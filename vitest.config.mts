import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": import.meta.dirname } },
  // components/*.tsx usam JSX; o tsconfig é "preserve" (Next), então o vitest precisa do transform automático
  oxc: { jsx: { runtime: "automatic" } },
  test: { include: ["lib/**/*.test.ts"], environment: "node" },
});
