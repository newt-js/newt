CREATE TABLE newt_inbox (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  received_at TEXT NOT NULL
);
CREATE INDEX newt_inbox_received ON newt_inbox (received_at);
