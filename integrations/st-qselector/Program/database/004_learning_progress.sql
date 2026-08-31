BEGIN;

-- Per-account learning progress for the portal (textbook topics, simulation
-- activities, R/Python lessons). One row per user; the JSONB payload mirrors
-- the portal's LearningProgress shape. `revision` drives optimistic
-- concurrency: a PUT carrying a stale revision is union-merged server-side
-- so multiple devices can append completed items without losing data.
CREATE TABLE IF NOT EXISTS learning_progress (
  user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
