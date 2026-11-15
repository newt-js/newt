CREATE TABLE newt_job_queue (
  name TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE newt_job (
  id TEXT PRIMARY KEY,
  queue TEXT NOT NULL,
  event TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  run_after TEXT NOT NULL,
  locked_by TEXT,
  locked_until TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX newt_job_ready ON newt_job (status, run_after);
CREATE INDEX newt_job_queue_status ON newt_job (queue, status);
CREATE INDEX newt_job_created ON newt_job (created_at, id);

CREATE TABLE newt_schedule_tick (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  due_at TEXT NOT NULL
);
