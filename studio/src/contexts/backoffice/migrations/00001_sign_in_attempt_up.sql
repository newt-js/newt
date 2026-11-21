-- One sign-in through auth, while the browser is there: what backoffice must check when it comes back.
-- state is kept only as a hash; the verifier and the nonce are sent to auth, so they are kept as they are.
-- Once finished, it keeps who signed in and the id_token, which tells auth who signs out.
CREATE TABLE "sign_in_attempt" (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  state_hash TEXT NOT NULL UNIQUE,
  nonce TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  user_id TEXT,
  id_token TEXT,
  expires_at TEXT NOT NULL,
  finished_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
