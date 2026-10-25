import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-plugin";

export default defineConfig({
  plugins: [cloudflareTest({
    wrangler: { configPath: "./wrangler.jsonc" }, remoteBindings: false,
    miniflare: { bindings: { CF_ACCESS_TEAM_DOMAIN: "https://access.test", CF_ACCESS_AUD: "test-audience" } },
  })],
  test: { include: ["test/**/*.test.ts"] },
});
