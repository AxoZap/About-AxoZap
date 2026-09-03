CREATE TABLE IF NOT EXISTS internships (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT,
  work_model TEXT,
  season TEXT,
  date_applied TEXT,
  status TEXT NOT NULL,
  job_url TEXT,
  portal_url TEXT,
  salary TEXT,
  notes TEXT,
  updated_at TEXT
);
