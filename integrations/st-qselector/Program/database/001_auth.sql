BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'teacher', 'superadmin')),
  must_change_password boolean NOT NULL DEFAULT true,
  disabled boolean NOT NULL DEFAULT false,
  session_version integer NOT NULL DEFAULT 1 CHECK (session_version > 0),
  created_by bigint REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  CONSTRAINT users_username_length CHECK (char_length(username) BETWEEN 3 AND 64),
  CONSTRAINT users_username_format CHECK (username ~ '^[A-Za-z0-9_.-]+$')
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique
  ON users (lower(username));

CREATE TABLE IF NOT EXISTS sessions (
  token_hash character(64) PRIMARY KEY,
  csrf_hash character(64) NOT NULL,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_version integer NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  principal text NOT NULL,
  route text NOT NULL,
  bucket_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (principal, route, bucket_start)
);

CREATE INDEX IF NOT EXISTS api_rate_limits_bucket_idx
  ON api_rate_limits(bucket_start);

CREATE TABLE IF NOT EXISTS audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_target_idx ON audit_log(target_user_id, created_at DESC);

COMMIT;
