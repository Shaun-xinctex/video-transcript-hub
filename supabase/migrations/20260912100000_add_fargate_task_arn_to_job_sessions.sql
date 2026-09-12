-- M4: idempotency for the stateless Lambda distributor.
--
-- M1's distributor.py kept a set of already-spawned job ids in memory, which a
-- Lambda cannot do: every tick is a cold, stateless invocation. The ARN column
-- moves that bookkeeping into the database -- the distributor only spawns rows
-- WHERE fargate_task_arn IS NULL and stamps the ARN immediately after RunTask,
-- so the next tick skips the job even though the Lambda remembers nothing.
--
-- The partial index keeps that hot "not yet spawned" lookup cheap: it only
-- holds the handful of unspawned rows, not every session ever created.

ALTER TABLE job_sessions ADD COLUMN IF NOT EXISTS fargate_task_arn TEXT;

CREATE INDEX IF NOT EXISTS idx_job_sessions_unspawned
  ON job_sessions (id) WHERE fargate_task_arn IS NULL;
