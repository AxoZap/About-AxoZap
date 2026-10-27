import { env } from 'cloudflare:workers';
import { applyD1Migrations, reset, type D1Migration } from 'cloudflare:test';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import app from '../src/index';
import schema from '../schema.sql?raw';

const bindings = env as { axozap_internships_db: D1Database; TEST_MIGRATIONS: D1Migration[]; CF_ACCESS_TEAM_DOMAIN: string; CF_ACCESS_AUD: string; SQL_OWNER_EMAIL: string; SQL_ALLOWED_ORIGIN: string };
const db = bindings.axozap_internships_db;
const migrate = () => applyD1Migrations(db, bindings.TEST_MIGRATIONS);
const history = () => db.prepare('SELECT status, interview_round, rejected, baseline, recorded_at FROM internship_status_history ORDER BY sequence').all();
async function insert(status = 'Applied') {
  await db.prepare("INSERT INTO internships (id, company, role, status) VALUES ('test', 'Example', 'Intern', ?)").bind(status).run();
}
beforeEach(async () => { await reset(); await db.prepare(schema).run(); });
afterEach(() => vi.restoreAllMocks());

it('seeds only the known current status and does not duplicate it on migration retry', async () => {
  await insert('OA');
  await migrate();
  await migrate();
  const { results } = await history();
  expect(results).toHaveLength(1);
  expect(results[0]).toMatchObject({ status: 'OA', baseline: 1 });
  expect(results[0].recorded_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

it('records actual skipped stages, rounds, rejections and undo in order', async () => {
  await migrate();
  await insert();
  await db.prepare("UPDATE internships SET status = 'Interview Round', interview_round = '1' WHERE id = 'test'").run();
  await db.prepare("UPDATE internships SET interview_round = 'Final' WHERE id = 'test'").run();
  await db.prepare("UPDATE internships SET rejected = 1 WHERE id = 'test'").run();
  await db.prepare("UPDATE internships SET rejected = 0 WHERE id = 'test'").run();
  await db.prepare("UPDATE internships SET notes = 'An unrelated edit', status = 'Interview Round', interview_round = 'Final', rejected = 0 WHERE id = 'test'").run();
  expect((await history()).results.map(row => [row.status, row.interview_round, row.rejected, row.baseline])).toEqual([
    ['Applied', null, 0, 0], ['Interview Round', '1', 0, 0], ['Interview Round', 'Final', 0, 0],
    ['Interview Round', 'Final', 1, 0], ['Interview Round', 'Final', 0, 0],
  ]);
});

it('rolls back history with a failed SQL batch and deletes it with the application', async () => {
  await migrate();
  await insert();
  await expect(db.batch([
    db.prepare("UPDATE internships SET status = 'OA' WHERE id = 'test'"),
    db.prepare("INSERT INTO internships (id, company, role, status) VALUES ('test', 'Duplicate', 'Intern', 'Applied')"),
  ])).rejects.toThrow();
  expect((await history()).results).toHaveLength(1);
  await db.prepare("DELETE FROM internships WHERE id = 'test'").run();
  expect((await history()).results).toHaveLength(0);
});

it('returns persisted history after create, edit and reload and ignores client history', async () => {
  await migrate();
  const keys = await generateKeyPair('RS256', { extractable: true });
  const publicKey = { ...await exportJWK(keys.publicKey), kid: 'test', alg: 'RS256', use: 'sig' };
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({ keys: [publicKey] }));
  const jwt = await new SignJWT({ email: bindings.SQL_OWNER_EMAIL }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).setIssuer(bindings.CF_ACCESS_TEAM_DOMAIN)
    .setAudience(bindings.CF_ACCESS_AUD).setSubject('owner').setIssuedAt().setExpirationTime('5m').sign(keys.privateKey);
  async function request(method: string, path: string, internship?: Record<string, unknown>) {
    return app.request(`https://worker.test/api/internships${path}`, {
      method, headers: { 'Content-Type': 'application/json', 'Cf-Access-Jwt-Assertion': jwt },
      ...(internship ? { body: JSON.stringify({ internship }) } : {}),
    }, bindings);
  }
  const initial = { id: 'test', company: 'Example', role: 'Intern', status: 'Applied', statusHistory: [{ status: 'Offer' }] };
  const created = await request('POST', '', initial);
  expect(created.status).toBe(200);
  expect((await created.json<any>()).statusHistory.map((entry: any) => entry.status)).toEqual(['Applied']);
  const updated = await request('PUT', '/test', { ...initial, status: 'Interview Round', interviewRound: 'Final' });
  expect(updated.status).toBe(200);
  const saved = await updated.json<any>();
  expect(saved.statusHistory.map((entry: any) => entry.status)).toEqual(['Applied', 'Interview Round']);
  expect(saved.statusHistory[1]).toMatchObject({ interviewRound: 'Final', rejected: false, baseline: false });
  expect((await (await request('GET', '')).json<any>())[0].statusHistory).toEqual(saved.statusHistory);
  expect((await request('PUT', '/missing', initial)).status).toBe(404);
});
