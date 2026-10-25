import { Hono } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { readSql, splitSql } from "./sql";

type Bindings = {
  axozap_internships_db: D1Database;
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD: string;
  SQL_OWNER_EMAIL: string;
  SQL_ALLOWED_ORIGIN: string;
};

interface InternshipRow {
  id: string;
  company: string;
  role: string;
  location?: string;
  work_model?: string;
  season?: string;
  date_applied?: string;
  status: string;
  interview_round?: string;
  rejected: number;
  job_url?: string;
  portal_url?: string;
  salary?: string;
  notes?: string;
  updated_at?: string;
}

const app = new Hono<{ Bindings: Bindings; Variables: { accessEmail: string } }>();

// The workers.dev URL is public, so every data request must verify Access itself.
app.use("/api/*", async (c, next) => {
  const issuer = c.env.CF_ACCESS_TEAM_DOMAIN;
  const audience = c.env.CF_ACCESS_AUD;
  if (!issuer || !audience) {
    return c.json({ error: "Access is not configured" }, 503);
  }

  const token = c.req.header("Cf-Access-Jwt-Assertion");
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const { payload } = await jwtVerify(token, jwks, { issuer, audience, algorithms: ["RS256"] });
    c.set("accessEmail", typeof payload.email === "string" ? payload.email.toLowerCase() : "");
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
});

// Map DB row (snake_case) to Frontend model (camelCase)
function mapRowToModel(row: InternshipRow) {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    location: row.location || "",
    workModel: row.work_model || "Remote",
    season: row.season || "Summer 2027",
    dateApplied: row.date_applied || "",
    status: row.status,
    interviewRound: row.interview_round || undefined,
    rejected: Boolean(row.rejected),
    jobUrl: row.job_url || undefined,
    portalUrl: row.portal_url || undefined,
    salary: row.salary || undefined,
    notes: row.notes || undefined,
    updatedAt: row.updated_at || "",
  };
}

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/api/sql", async (c) => {
  c.header("Cache-Control", "no-store");
  if (!c.env.SQL_OWNER_EMAIL || !c.env.SQL_ALLOWED_ORIGIN) return c.json({ error: "SQL runner is not configured" }, 503);
  if (c.get("accessEmail") !== c.env.SQL_OWNER_EMAIL.toLowerCase()) return c.json({ error: "Only the tracker owner can run SQL" }, 403);
  if (c.req.header("Origin") !== c.env.SQL_ALLOWED_ORIGIN) return c.json({ error: "Invalid request origin" }, 403);
  if (c.req.header("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") return c.json({ error: "Expected JSON" }, 415);
  try {
    const statements = splitSql(await readSql(c.req.raw));
    // A batch is atomic: a failed statement rolls back all changes in this run.
    const results = await c.env.axozap_internships_db.batch(statements.map(sql => c.env.axozap_internships_db.prepare(sql)));
    return c.json({
      statements: results.length,
      changes: results.reduce((sum, result) => sum + result.meta.changes, 0),
      results: results.map(result => result.results.slice(0, 100)),
      truncated: results.some(result => result.results.length > 100),
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message.slice(0, 500) : "SQL could not be run" }, 400);
  }
});

// GET: Fetch all internships
app.get("/api/internships", async (c) => {
  const { results } = await c.env.axozap_internships_db
    .prepare("SELECT * FROM internships ORDER BY date_applied DESC, updated_at DESC")
    .all<InternshipRow>();

  return c.json(results.map(mapRowToModel));
});

// POST: Add new internship
app.post("/api/internships", async (c) => {
  const body = await c.req.json();
  const { internship } = body;

  const id = internship.id || "app-" + Date.now();
  const now = new Date().toISOString().split("T")[0];

  await c.env.axozap_internships_db
    .prepare(
      `INSERT INTO internships (id, company, role, location, work_model, season, date_applied, status, interview_round, rejected, job_url, portal_url, salary, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      internship.company,
      internship.role,
      internship.location || "",
      internship.workModel || "Hybrid",
      internship.season || "Summer 2027",
      internship.dateApplied || now,
      internship.status || "Applied",
      internship.status === "Interview Round" ? internship.interviewRound?.trim() || null : null,
      internship.rejected ? 1 : 0,
      internship.jobUrl || null,
      internship.portalUrl || null,
      internship.salary || null,
      internship.notes || null,
      now
    )
    .run();

  return c.json({ ...internship, id, updatedAt: now });
});

// PUT: Update an existing internship
app.put("/api/internships/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { internship } = body;

  const now = new Date().toISOString().split("T")[0];

  await c.env.axozap_internships_db
    .prepare(
      `UPDATE internships SET
         company = ?,
         role = ?,
         location = ?,
         work_model = ?,
         season = ?,
         date_applied = ?,
         status = ?,
         interview_round = ?,
         rejected = ?,
         job_url = ?,
         portal_url = ?,
         salary = ?,
         notes = ?,
         updated_at = ?
       WHERE id = ?`
    )
    .bind(
      internship.company,
      internship.role,
      internship.location || "",
      internship.workModel || "Hybrid",
      internship.season || "Summer 2026",
      internship.dateApplied || now,
      internship.status || "Applied",
      internship.status === "Interview Round" ? internship.interviewRound?.trim() || null : null,
      internship.rejected ? 1 : 0,
      internship.jobUrl || null,
      internship.portalUrl || null,
      internship.salary || null,
      internship.notes || null,
      now,
      id
    )
    .run();

  return c.json({ ...internship, id, updatedAt: now });
});

// DELETE: Remove an internship
app.delete("/api/internships/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.axozap_internships_db
    .prepare("DELETE FROM internships WHERE id = ?")
    .bind(id)
    .run();

  return c.json({ success: true });
});

export default app;
