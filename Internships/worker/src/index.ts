import { Hono } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";

type Bindings = {
  axozap_internships_db: D1Database;
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD: string;
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

const app = new Hono<{ Bindings: Bindings }>();

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
    await jwtVerify(token, jwks, { issuer, audience, algorithms: ["RS256"] });
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
