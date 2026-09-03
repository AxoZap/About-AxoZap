import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  axozap_internships_db: D1Database;
  ADMIN_PASSWORD?: string;
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
  job_url?: string;
  portal_url?: string;
  salary?: string;
  notes?: string;
  updated_at?: string;
}

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware allowing requests from your domain
app.use(
  "/*",
  cors({
    origin: (origin) => {
      // Allow localhost, internships.axozap.me, and axozap.me
      if (!origin) return "*";
      if (
        origin.includes("localhost") ||
        origin.endsWith("axozap.me") ||
        origin.endsWith("workers.dev") ||
        origin.endsWith("pages.dev")
      ) {
        return origin;
      }
      return "*";
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 600,
  })
);

// Map DB row (snake_case) to Frontend model (camelCase)
function mapRowToModel(row: any) {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    location: row.location || "",
    workModel: row.work_model || "Remote",
    season: row.season || "Summer 2027",
    dateApplied: row.date_applied || "",
    status: row.status,
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
    .all();

  return c.json(results.map(mapRowToModel));
});

// POST: Add new internship
app.post("/api/internships", async (c) => {
  const body = await c.req.json();
  const { password, internship } = body;

  const adminPw = c.env.ADMIN_PASSWORD;
  if (adminPw && password !== adminPw) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = internship.id || "app-" + Date.now();
  const now = new Date().toISOString().split("T")[0];

  await c.env.axozap_internships_db
    .prepare(
      `INSERT INTO internships (id, company, role, location, work_model, season, date_applied, status, job_url, portal_url, salary, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
  const { password, internship } = body;

  const adminPw = c.env.ADMIN_PASSWORD;
  if (adminPw && password !== adminPw) {
    return c.json({ error: "Unauthorized" }, 401);
  }

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
  const body = await c.req.json().catch(() => ({}));
  const { password } = body;

  const adminPw = c.env.ADMIN_PASSWORD;
  if (adminPw && password !== adminPw) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await c.env.axozap_internships_db
    .prepare("DELETE FROM internships WHERE id = ?")
    .bind(id)
    .run();

  return c.json({ success: true });
});

export default app;
