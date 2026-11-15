CREATE EXTENSION IF NOT EXISTS citext;

CREATE COLLATION ci (provider = icu, locale = 'und-u-ks-level2', deterministic = false);

CREATE TABLE odd (
  id TEXT COLLATE "C" PRIMARY KEY,
  version INTEGER NOT NULL,
  name TEXT COLLATE "und-x-icu" NOT NULL,
  email citext NOT NULL,
  nick TEXT COLLATE "C" NOT NULL
);

CREATE UNIQUE INDEX odd_nick ON odd (nick COLLATE ci);
