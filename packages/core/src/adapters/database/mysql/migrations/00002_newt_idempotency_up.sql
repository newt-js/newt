CREATE TABLE newt_idempotency_key (
  id VARCHAR(64) COLLATE utf8mb4_0900_bin PRIMARY KEY,
  version INTEGER NOT NULL,
  body_hash VARCHAR(64) COLLATE utf8mb4_0900_bin NOT NULL,
  status INTEGER NOT NULL,
  headers TEXT COLLATE utf8mb4_0900_bin NOT NULL,
  body MEDIUMTEXT COLLATE utf8mb4_0900_bin NOT NULL,
  expires_at VARCHAR(32) COLLATE utf8mb4_0900_bin NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
CREATE INDEX newt_idempotency_key_expires ON newt_idempotency_key (expires_at);
