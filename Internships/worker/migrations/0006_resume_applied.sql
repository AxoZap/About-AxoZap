-- Applied is now also the main active status. An application can resume from
-- a terminal status without inventing another stage in its flow. History is
-- retained; the flow builder includes Applied only once, at the start.
DROP TRIGGER IF EXISTS internships_applied_first;
