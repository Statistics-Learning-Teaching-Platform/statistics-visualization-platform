BEGIN;

CREATE TABLE IF NOT EXISTS private_assets (
  asset_key text PRIMARY KEY,
  content_type text NOT NULL,
  access_scope text NOT NULL CHECK (access_scope IN ('question', 'answer', 'attachment')),
  content bytea NOT NULL,
  content_length bigint NOT NULL CHECK (content_length >= 0),
  content_sha256 character(64) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT private_assets_key_format CHECK (asset_key ~ '^Ch(0[1-9]|1[0-3])/.+')
);

CREATE TABLE IF NOT EXISTS ai_question_drafts (
  id text PRIMARY KEY,
  owner_user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  content_hash character(64) NOT NULL,
  generation_job jsonb NOT NULL,
  verifier_output jsonb NOT NULL,
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  adopted boolean NOT NULL DEFAULT false,
  reviewed_by bigint REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, content_hash)
);

CREATE INDEX IF NOT EXISTS ai_question_drafts_owner_idx
  ON ai_question_drafts(owner_user_id, adopted, updated_at DESC);

CREATE TABLE IF NOT EXISTS api_concurrency_leases (
  route text NOT NULL,
  lease_token text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_concurrency_leases_expiry_idx
  ON api_concurrency_leases(expires_at);

COMMIT;
