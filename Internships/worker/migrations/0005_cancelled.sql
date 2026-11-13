-- Cancellation is an outcome flag, independent of the application stage.
ALTER TABLE internships ADD COLUMN cancelled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE internship_status_history ADD COLUMN cancelled INTEGER NOT NULL DEFAULT 0;

DROP TRIGGER internships_history_insert;
DROP TRIGGER internships_history_update;

CREATE TRIGGER internships_history_insert
AFTER INSERT ON internships
BEGIN
  INSERT INTO internship_status_history (internship_id, status, rejected, cancelled, initial)
  SELECT NEW.id, 'Applied', CASE WHEN NEW.status = 'Applied' THEN NEW.rejected ELSE 0 END, CASE WHEN NEW.status = 'Applied' THEN NEW.cancelled ELSE 0 END, 1
  WHERE NEW.status <> 'Bookmarked';
  INSERT INTO internship_status_history (internship_id, status, interview_round, rejected, cancelled)
  SELECT NEW.id, NEW.status, NEW.interview_round, NEW.rejected, NEW.cancelled WHERE NEW.status <> 'Applied';
END;

CREATE TRIGGER internships_history_update
AFTER UPDATE OF status, interview_round, rejected, cancelled ON internships
WHEN OLD.status IS NOT NEW.status
  OR NULLIF(trim(OLD.interview_round), '') IS NOT NULLIF(trim(NEW.interview_round), '')
  OR OLD.rejected IS NOT NEW.rejected
  OR OLD.cancelled IS NOT NEW.cancelled
BEGIN
  INSERT INTO internship_status_history (internship_id, status, rejected, cancelled, initial)
  SELECT NEW.id, 'Applied', CASE WHEN NEW.status = 'Applied' THEN NEW.rejected ELSE 0 END, CASE WHEN NEW.status = 'Applied' THEN NEW.cancelled ELSE 0 END, 1
  WHERE NEW.status <> 'Bookmarked' AND NOT EXISTS (
    SELECT 1 FROM internship_status_history WHERE internship_id = NEW.id AND initial = 1
  );
  INSERT INTO internship_status_history (internship_id, status, interview_round, rejected, cancelled)
  SELECT NEW.id, NEW.status, NEW.interview_round, NEW.rejected, NEW.cancelled
  WHERE NEW.status <> 'Applied' OR OLD.status <> 'Bookmarked';
END;
