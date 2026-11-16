CREATE TABLE newt_inbox (
  id TEXT COLLATE "C" PRIMARY KEY,
  version INTEGER NOT NULL,
  received_at TEXT COLLATE "C" NOT NULL
);
CREATE INDEX newt_inbox_received ON newt_inbox (received_at);
