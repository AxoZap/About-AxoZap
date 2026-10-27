import { env } from "cloudflare:workers";
import { applyD1Migrations, createExecutionContext, reset, waitOnExecutionContext, type D1Migration } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import app from "../src/index";
import { splitSql } from "../src/sql";
import { onRequest as proxy } from "../../functions/api/sql";
import schema from "../schema.sql?raw";

let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let publicKey: Record<string, unknown>;
const bindings = env as {
  axozap_internships_db: D1Database; CF_ACCESS_TEAM_DOMAIN: string; CF_ACCESS_AUD: string;
  SQL_OWNER_EMAIL: string; SQL_ALLOWED_ORIGIN: string;
  TEST_MIGRATIONS: D1Migration[];
};
beforeAll(async () => {
  keys = await generateKeyPair("RS256", { extractable: true });
  publicKey = { ...await exportJWK(keys.publicKey), kid: "test", alg: "RS256", use: "sig" };
});
beforeEach(async () => {
  await reset();
  await bindings.axozap_internships_db.prepare(schema).run();
  await applyD1Migrations(bindings.axozap_internships_db, bindings.TEST_MIGRATIONS);
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ keys: [publicKey] }));
});
afterEach(() => vi.restoreAllMocks());
async function token(email = bindings.SQL_OWNER_EMAIL, audience = bindings.CF_ACCESS_AUD) {
  return new SignJWT({ email }).setProtectedHeader({ alg: "RS256", kid: "test" }).setIssuer(bindings.CF_ACCESS_TEAM_DOMAIN)
    .setAudience(audience).setSubject("owner").setIssuedAt().setExpirationTime("5m").sign(keys.privateKey);
}
async function run(body: string, headers: Record<string, string> = {}) {
  const ctx = createExecutionContext();
  const response = await app.fetch(new Request("https://worker.test/api/sql", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: bindings.SQL_ALLOWED_ORIGIN, ...headers }, body,
  }), bindings, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}
async function sql(query: string, headers: Record<string, string> = {}) {
  return run(JSON.stringify({ sql: query }), { "Cf-Access-Jwt-Assertion": await token(), ...headers });
}

it("denies anonymous, forged and wrong-audience tokens", async () => {
  for (const headers of [{}, { "Cf-Access-Jwt-Assertion": "forged" }, { "Cf-Access-Jwt-Assertion": await token(undefined, "wrong") }]) {
    expect((await run('{"sql":"SELECT 1"}', headers)).status).toBe(401);
  }
});
it("allows only the verified owner, not another valid Access identity", async () => {
  expect((await sql("SELECT 1", { "Cf-Access-Jwt-Assertion": await token("other@example.com") })).status).toBe(403);
  expect((await sql("SELECT 1", { "Cf-Access-Jwt-Assertion": await token("AXOZAP14@GMAIL.COM") })).status).toBe(200);
});
it("blocks cross-site requests and form submissions", async () => {
  expect((await sql("SELECT 1", { Origin: "https://evil.test" })).status).toBe(403);
  expect((await sql("SELECT 1", { Origin: "" })).status).toBe(403);
  expect((await sql("SELECT 1", { "Content-Type": "text/plain" })).status).toBe(415);
});
it("runs multiline SQL and multiple statements without splitting strings or comments", async () => {
  const response = await sql(`-- Import; this is a comment
    INSERT INTO internships
      (id, company, role, status, notes)
    VALUES ('test', 'O''Brien; Co', 'Intern', 'Applied', 'line one; line two');
    /* another ; comment */ SELECT company, notes FROM internships;`);
  expect(response.status, await response.clone().text()).toBe(200);
  const result = await response.json<any>();
  expect(result.statements).toBe(2);
  expect(result.results[1][0]).toEqual({ company: "O'Brien; Co", notes: "line one; line two" });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
it("rolls back the whole SQL run when a later statement fails", async () => {
  const response = await sql("INSERT INTO internships (id, company, role, status) VALUES ('rollback', 'Example', 'Intern', 'Applied'); INSERT INTO missing_table VALUES (1);");
  expect(response.status).toBe(400);
  expect(await bindings.axozap_internships_db.prepare("SELECT COUNT(*) AS total FROM internships").first("total")).toBe(0);
});
it("reports invalid, empty, oversized and excessive SQL instead of running it", async () => {
  const headers = { "Cf-Access-Jwt-Assertion": await token() };
  for (const body of ["not json", "{}", '{"sql":1}', '{"sql":"-- only a comment"}', JSON.stringify({ sql: "x".repeat(70_000) })]) {
    expect((await run(body, headers)).status).toBe(400);
  }
  for (const query of ["SELECT 'unclosed", "SELECT 1 /* unclosed", "SELECT 1;".repeat(51)]) expect((await sql(query)).status).toBe(400);
});
it("limits displayed query rows while reporting truncation", async () => {
  const response = await sql("WITH RECURSIVE numbers(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM numbers WHERE x<101) SELECT x FROM numbers;");
  const result = await response.json<any>();
  expect(result.results[0]).toHaveLength(100);
  expect(result.truncated).toBe(true);
});
it("keeps quoted identifiers and rejects unsupported trigger scripts before executing", () => {
  expect(splitSql('SELECT ";", `a;b`, [c;d]; SELECT 2;')).toHaveLength(2);
  expect(() => splitSql("CREATE TRIGGER t AFTER INSERT ON internships BEGIN SELECT 1; END;")).toThrow("trigger definitions");
});
it("the Pages proxy forwards identity and origin without forwarding browser cookies", async () => {
  const jwt = await token();
  vi.mocked(fetch).mockImplementationOnce(async (input, init) => {
    const request = new Request(input, init);
    expect(request.url).toBe("https://axozap-internships-backend.peteystillwell.workers.dev/api/sql");
    expect(request.headers.get("Cf-Access-Jwt-Assertion")).toBe(jwt);
    expect(request.headers.get("Origin")).toBe(bindings.SQL_ALLOWED_ORIGIN);
    expect(request.headers.get("Cookie")).toBeNull();
    expect(await request.json()).toEqual({ sql: "SELECT 1" });
    return Response.json({ statements: 1, changes: 0, results: [[{ value: 1 }]], truncated: false });
  });
  const response = await proxy({ request: new Request(bindings.SQL_ALLOWED_ORIGIN + "/api/sql", {
    method: "POST", headers: { "Cf-Access-Jwt-Assertion": jwt, Origin: bindings.SQL_ALLOWED_ORIGIN, Cookie: "CF_Authorization=private", "Content-Type": "application/json" },
    body: '{"sql":"SELECT 1"}',
  }) });
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect((await proxy({ request: new Request(bindings.SQL_ALLOWED_ORIGIN + "/api/sql", { method: "POST" }) })).status).toBe(401);
});
