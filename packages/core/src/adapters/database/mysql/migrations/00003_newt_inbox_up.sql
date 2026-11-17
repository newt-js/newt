CREATE TABLE newt_inbox (
  id VARCHAR(512) COLLATE utf8mb4_0900_bin PRIMARY KEY,
  version INTEGER NOT NULL,
  received_at VARCHAR(32) COLLATE utf8mb4_0900_bin NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
CREATE INDEX newt_inbox_received ON newt_inbox (received_at);
