CREATE TABLE item (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  name TEXT,
  code TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL,
  data JSON,
  amount INTEGER
);

CREATE TABLE things (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  tag TEXT
);

CREATE TABLE pair (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  tenant TEXT NOT NULL,
  code TEXT NOT NULL,
  email TEXT NOT NULL,
  UNIQUE (tenant, code)
);

CREATE UNIQUE INDEX pair_email_unique ON pair (email);

CREATE TABLE "campaigns$template" (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  name TEXT NOT NULL UNIQUE,
  body TEXT
);
