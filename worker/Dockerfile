# M4 worker image — the same M1 pipeline, now a Fargate task instead of an
# EC2 subprocess. Built by CodeBuild from this repo, pushed to ECR, pulled by
# one Fargate task per job.
#
# Build context is ./worker (see buildspec.yml), so the COPY paths below are
# relative to that directory, not the repo root.
FROM python:3.12-slim

# worker.py shells out to all three of these: yt-dlp (from requirements.txt)
# downloads, ffmpeg transcodes and chunks, ffprobe reads the exact duration
# when yt-dlp's cheap probe returns "NA". The ffmpeg package supplies both
# binaries. Baking them in is the whole reason the worker is a container
# rather than a Lambda.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY worker.py .

# Fargate ships stdout/stderr to CloudWatch. Python buffers stdout when it is
# not a TTY, so without this the job's progress lines would arrive in a clump
# at exit -- or not at all if the container dies mid-job, which is exactly when
# the logs matter most.
ENV PYTHONUNBUFFERED=1

# JOB_ID, OPENAI_API_KEY, SUPABASE_URL and SUPABASE_SECRET_KEY all arrive as
# env vars from the Lambda distributor's RunTask containerOverrides. worker.py's
# _load_secrets() prefers env and falls back to Secrets Manager only on the M1
# EC2 path -- the Fargate task role deliberately cannot reach Secrets Manager.
CMD ["python", "worker.py"]
