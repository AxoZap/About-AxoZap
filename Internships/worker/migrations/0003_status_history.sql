CREATE TABLE IF NOT EXISTS internship_status_history (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  internship_id TEXT NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  interview_round TEXT,
  rejected INTEGER NOT NULL DEFAULT 0,
  recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  baseline INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS internship_status_history_application
  ON internship_status_history(internship_id, sequence);

-- Existing records are snapshots, not a reconstruction of earlier stages.
INSERT INTO internship_status_history (internship_id, status, interview_round, rejected, baseline)
SELECT id, status, interview_round, rejected, 1 FROM internships
WHERE NOT EXISTS (SELECT 1 FROM internship_status_history WHERE internship_id = internships.id);

-- Database triggers also capture changes from the SQL runner and direct D1 access.
CREATE TRIGGER IF NOT EXISTS internships_history_insert
AFTER INSERT ON internships
BEGIN
  INSERT INTO internship_status_history (internship_id, status, interview_round, rejected)
  VALUES (NEW.id, NEW.status, NEW.interview_round, NEW.rejected);
END;

CREATE TRIGGER IF NOT EXISTS internships_history_update
AFTER UPDATE OF status, interview_round, rejected ON internships
WHEN OLD.status IS NOT NEW.status
  OR NULLIF(trim(OLD.interview_round), '') IS NOT NULLIF(trim(NEW.interview_round), '')
  OR OLD.rejected IS NOT NEW.rejected
BEGIN
  INSERT INTO internship_status_history (internship_id, status, interview_round, rejected)
  VALUES (NEW.id, NEW.status, NEW.interview_round, NEW.rejected);
END;
