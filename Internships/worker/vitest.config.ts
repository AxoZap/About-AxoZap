import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";

export default defineConfig(async () => ({
  plugins: [cloudflareTest({
    wrangler: { configPath: "./wrangler.jsonc" }, remoteBindings: false,
    miniflare: { bindings: {
      CF_ACCESS_TEAM_DOMAIN: "https://access.test", CF_ACCESS_AUD: "test-audience",
      TEST_MIGRATIONS: (await readD1Migrations('./migrations')).filter(migration => migration.name >= '0003'),
    } },
  })],
  test: { include: ["test/**/*.test.ts"] },
}));
