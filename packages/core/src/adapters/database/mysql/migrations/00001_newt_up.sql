CREATE TABLE newt_job_queue (
  name VARCHAR(255) COLLATE utf8mb4_0900_bin PRIMARY KEY,
  event VARCHAR(255) COLLATE utf8mb4_0900_bin NOT NULL,
  attempts INTEGER NOT NULL,
  created_at VARCHAR(32) COLLATE utf8mb4_0900_bin NOT NULL,
  last_seen_at VARCHAR(32) COLLATE utf8mb4_0900_bin NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;

CREATE TABLE newt_job (
  id VARCHAR(64) COLLATE utf8mb4_0900_bin PRIMARY KEY,
  queue VARCHAR(255) COLLATE utf8mb4_0900_bin NOT NULL,
  event LONGTEXT NOT NULL,
  status VARCHAR(16) COLLATE utf8mb4_0900_bin NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  run_after VARCHAR(32) COLLATE utf8mb4_0900_bin NOT NULL,
  locked_by VARCHAR(255) COLLATE utf8mb4_0900_bin,
  locked_until VARCHAR(32) COLLATE utf8mb4_0900_bin,
  last_error LONGTEXT,
  created_at VARCHAR(32) COLLATE utf8mb4_0900_bin NOT NULL,
  updated_at VARCHAR(32) COLLATE utf8mb4_0900_bin NOT NULL,
  INDEX newt_job_ready (status, run_after),
  INDEX newt_job_queue_status (queue, status),
  INDEX newt_job_created (created_at, id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;

CREATE TABLE newt_schedule_tick (
  id VARCHAR(255) COLLATE utf8mb4_0900_bin PRIMARY KEY,
  version INTEGER NOT NULL,
  due_at VARCHAR(32) COLLATE utf8mb4_0900_bin NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
