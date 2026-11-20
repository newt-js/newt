-- One try to sign in to an application, step by step. user_id is null when no user has the email given:
-- the attempt goes on all the same, so it never tells whether an email exists.
CREATE TABLE "sign_in_attempt" (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  application_id TEXT NOT NULL REFERENCES "application" (id),
  user_id TEXT REFERENCES "user" (id),
  pending_steps JSON NOT NULL,
  done_steps JSON NOT NULL,
  failed_tries INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
