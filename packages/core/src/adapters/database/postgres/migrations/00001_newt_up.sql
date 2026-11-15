CREATE TABLE newt_job_queue (
  name TEXT COLLATE "C" PRIMARY KEY,
  event TEXT COLLATE "C" NOT NULL,
  attempts INTEGER NOT NULL,
  created_at TEXT COLLATE "C" NOT NULL,
  last_seen_at TEXT COLLATE "C" NOT NULL
);

CREATE TABLE newt_job (
  id TEXT COLLATE "C" PRIMARY KEY,
  queue TEXT COLLATE "C" NOT NULL,
  event TEXT COLLATE "C" NOT NULL,
  status TEXT COLLATE "C" NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  run_after TEXT COLLATE "C" NOT NULL,
  locked_by TEXT COLLATE "C",
  locked_until TEXT COLLATE "C",
  last_error TEXT COLLATE "C",
  created_at TEXT COLLATE "C" NOT NULL,
  updated_at TEXT COLLATE "C" NOT NULL
);
CREATE INDEX newt_job_ready ON newt_job (status, run_after);
CREATE INDEX newt_job_queue_status ON newt_job (queue, status);
CREATE INDEX newt_job_created ON newt_job (created_at, id);

CREATE TABLE newt_schedule_tick (
  id TEXT COLLATE "C" PRIMARY KEY,
  version INTEGER NOT NULL,
  due_at TEXT COLLATE "C" NOT NULL
);
