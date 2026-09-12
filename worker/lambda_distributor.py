"""M4 Lambda distributor — the serverless replacement for M1's distributor.py.

EventBridge fires this once a minute. Each tick:

  1. SELECT jobs WHERE status='pending'
  2. make sure the job has a job_sessions row, and that jobs.current_session_id
     actually points at it
  3. skip any session that already carries a fargate_task_arn
  4. ecs:RunTask — one Fargate task per job, fire-and-forget
  5. stamp the returned task ARN on the session

Why the ARN column exists: M1's distributor kept a set of spawned job ids in
memory and could rely on it because it was a long-running process. A Lambda is
stateless -- every tick may be a cold start -- so the "already spawned" fact has
to live in the database or the same job gets a second task (and a second Whisper
bill) a minute later.

Scope: this ships only the spawn pass. Stuck-job recovery (session N+1) and
storage cleanup are deliberately out of scope for M4.

This module imports only boto3 and supabase. It never calls OpenAI -- it merely
forwards the API key into the task's environment, where worker.py uses it.
"""
import os

import boto3
from supabase import create_client

# Reused across warm invocations; created once per cold start.
_ecs = boto3.client("ecs")
_db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"])

CLUSTER = os.environ["ECS_CLUSTER"]
TASK_DEFINITION = os.environ["TASK_DEFINITION"]
SUBNETS = [s for s in os.environ["SUBNETS"].split(",") if s]
SECURITY_GROUPS = [s for s in os.environ.get("SECURITY_GROUPS", "").split(",") if s]

# Forwarded into the Fargate task. worker.py's _load_secrets() prefers env, so
# the task never needs Secrets Manager -- which is what lets its task role stay
# minimal.
FORWARDED = ("SUPABASE_URL", "SUPABASE_SECRET_KEY", "OPENAI_API_KEY")


def _ensure_session(job_id: str) -> tuple[str, str | None]:
    """Return (session_id, fargate_task_arn) for this job, creating the session
    if needed.

    The link-back update is the part that is easy to miss. POST /api/jobs
    creates both rows and sets jobs.current_session_id, so production traffic
    never notices -- but a job inserted straight into the table has a null link,
    and worker.py dies on its first update_session() call. Inserting a session
    without pointing the job at it reproduces that bug from the other side.
    """
    job = (_db.table("jobs").select("current_session_id")
           .eq("id", job_id).single().execute().data)

    session_id = job.get("current_session_id")
    if session_id:
        session = (_db.table("job_sessions").select("id, fargate_task_arn")
                   .eq("id", session_id).single().execute().data)
        return session["id"], session.get("fargate_task_arn")

    row = (_db.table("job_sessions")
           .insert({"job_id": job_id, "session_number": 1})
           .execute().data[0])
    _db.table("jobs").update({"current_session_id": row["id"]}).eq("id", job_id).execute()
    return row["id"], None


def _spawn(job_id: str) -> str:
    """Launch one Fargate task for this job and return its ARN."""
    environment = [{"name": "JOB_ID", "value": job_id}]
    environment += [{"name": k, "value": os.environ[k]} for k in FORWARDED if os.environ.get(k)]

    network = {"subnets": SUBNETS, "assignPublicIp": "ENABLED"}
    if SECURITY_GROUPS:
        network["securityGroups"] = SECURITY_GROUPS

    response = _ecs.run_task(
        cluster=CLUSTER,
        taskDefinition=TASK_DEFINITION,
        launchType="FARGATE",
        networkConfiguration={"awsvpcConfiguration": network},
        overrides={"containerOverrides": [{"name": "worker", "environment": environment}]},
    )

    failures = response.get("failures") or []
    if failures:
        raise RuntimeError(f"RunTask failed for {job_id}: {failures}")
    return response["tasks"][0]["taskArn"]


def handler(event, context):
    pending = _db.table("jobs").select("id").eq("status", "pending").execute().data
    spawned, skipped, errors = [], [], []

    for job in pending:
        job_id = job["id"]
        try:
            session_id, existing_arn = _ensure_session(job_id)

            if existing_arn:
                # A previous tick already launched this one. Nothing to do --
                # this is the check that keeps one job to one task.
                skipped.append(job_id)
                print(f"skip {job_id}: already spawned as {existing_arn}")
                continue

            task_arn = _spawn(job_id)

            # Stamp the ARN immediately. A crash between RunTask and this update
            # would let the next tick spawn a duplicate, so keep them adjacent.
            _db.table("job_sessions").update(
                {"fargate_task_arn": task_arn}).eq("id", session_id).execute()

            spawned.append(job_id)
            print(f"spawned {job_id} -> {task_arn}")

        except Exception as exc:
            # One bad job must not stop the others, and must not kill the tick.
            errors.append({"job_id": job_id, "error": str(exc)})
            print(f"error on {job_id}: {exc}")

    summary = {"pending": len(pending), "spawned": spawned,
               "skipped": skipped, "errors": errors}
    print(f"tick summary: {summary}")
    return summary
