ALTER TABLE internship_status_history ADD COLUMN initial INTEGER NOT NULL DEFAULT 0;

-- Promote an existing Applied snapshot to the fixed starting position. If it
-- was added after a later stage, it represents a correction to the baseline.
UPDATE internship_status_history AS h
SET initial = 1,
    baseline = CASE WHEN EXISTS (
      SELECT 1 FROM internship_status_history earlier
      WHERE earlier.internship_id = h.internship_id AND earlier.sequence < h.sequence
        AND earlier.status NOT IN ('Applied', 'Bookmarked')
    ) THEN 1 ELSE baseline END,
    recorded_at = CASE WHEN EXISTS (
      SELECT 1 FROM internship_status_history earlier
      WHERE earlier.internship_id = h.internship_id AND earlier.sequence < h.sequence
        AND earlier.status NOT IN ('Applied', 'Bookmarked')
    ) THEN (SELECT MIN(recorded_at) FROM internship_status_history WHERE internship_id = h.internship_id)
      ELSE recorded_at END
WHERE h.status = 'Applied' AND h.sequence = (
  SELECT MIN(sequence) FROM internship_status_history
  WHERE internship_id = h.internship_id AND status = 'Applied'
);

INSERT INTO internship_status_history (internship_id, status, rejected, recorded_at, baseline, initial)
SELECT i.id, 'Applied', 0,
  COALESCE((SELECT MIN(recorded_at) FROM internship_status_history WHERE internship_id = i.id), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  1, 1
FROM internships i WHERE i.status <> 'Bookmarked' AND NOT EXISTS (
  SELECT 1 FROM internship_status_history WHERE internship_id = i.id AND initial = 1
);

CREATE UNIQUE INDEX internship_status_history_initial
  ON internship_status_history(internship_id) WHERE initial = 1;

DROP TRIGGER internships_history_insert;
DROP TRIGGER internships_history_update;

CREATE TRIGGER internships_history_insert
AFTER INSERT ON internships
BEGIN
  INSERT INTO internship_status_history (internship_id, status, rejected, initial)
  SELECT NEW.id, 'Applied', CASE WHEN NEW.status = 'Applied' THEN NEW.rejected ELSE 0 END, 1
  WHERE NEW.status <> 'Bookmarked';
  INSERT INTO internship_status_history (internship_id, status, interview_round, rejected)
  SELECT NEW.id, NEW.status, NEW.interview_round, NEW.rejected WHERE NEW.status <> 'Applied';
END;

CREATE TRIGGER internships_applied_first
BEFORE UPDATE OF status ON internships
WHEN NEW.status = 'Applied' AND OLD.status <> 'Applied' AND EXISTS (
  SELECT 1 FROM internship_status_history
  WHERE internship_id = OLD.id AND status NOT IN ('Applied', 'Bookmarked')
)
BEGIN
  SELECT RAISE(ABORT, 'Applied is the starting stage and cannot follow another stage');
END;

CREATE TRIGGER internships_history_update
AFTER UPDATE OF status, interview_round, rejected ON internships
WHEN OLD.status IS NOT NEW.status
  OR NULLIF(trim(OLD.interview_round), '') IS NOT NULLIF(trim(NEW.interview_round), '')
  OR OLD.rejected IS NOT NEW.rejected
BEGIN
  INSERT INTO internship_status_history (internship_id, status, rejected, initial)
  SELECT NEW.id, 'Applied', CASE WHEN NEW.status = 'Applied' THEN NEW.rejected ELSE 0 END, 1
  WHERE NEW.status <> 'Bookmarked' AND NOT EXISTS (
    SELECT 1 FROM internship_status_history WHERE internship_id = NEW.id AND initial = 1
  );
  INSERT INTO internship_status_history (internship_id, status, interview_round, rejected)
  SELECT NEW.id, NEW.status, NEW.interview_round, NEW.rejected
  WHERE NEW.status <> 'Applied' OR OLD.status <> 'Bookmarked';
END;
