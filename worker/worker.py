"""
M2 worker: polls one job at a time, checks the user's credit balance against the
video duration, downloads the video, runs Whisper, writes TXT back to
job_sessions.subtitle_txt_content, then deducts credits on success.

Started by distributor.py (one Popen per pending job). Reads JOB_ID from env.
Reads OPENAI_API_KEY / SUPABASE_URL / SUPABASE_SECRET_KEY from AWS Secrets
Manager — the EC2's IAM instance profile grants `secretsmanager:GetSecretValue`
on exactly those three secret names, so no credentials ever live on disk.

M2 additions:
  * claim the job (status -> 'downloading') before any external work
  * probe duration cheaply via yt-dlp, fall back to ffprobe after download
  * mark 'insufficient_credits' and skip Whisper when the balance is short
  * write a 'deduction' ledger row and decrement profiles.credits_balance on done
  * on any unhandled failure, mark 'error' + record error_message so a crashed
    job never strands in a claimed status (credits are left untouched)
"""
import os
import sys
import math
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

import boto3
from openai import OpenAI
from supabase import create_client


def _get_secret(client, name: str) -> str:
    """Fetch one Secrets Manager secret by name (returns the SecretString)."""
    return client.get_secret_value(SecretId=name)["SecretString"]


def _load_secrets() -> dict[str, str]:
    """Pull the three M1 secrets from AWS Secrets Manager."""
    sm = boto3.client("secretsmanager")
    return {
        "OPENAI_API_KEY": _get_secret(sm, "openai-api-key"),
        "SUPABASE_URL": _get_secret(sm, "supabase-url"),
        "SUPABASE_SECRET_KEY": _get_secret(sm, "supabase-secret-key"),
    }


_secrets = _load_secrets()
db = create_client(_secrets["SUPABASE_URL"], _secrets["SUPABASE_SECRET_KEY"])
openai_client = OpenAI(api_key=_secrets["OPENAI_API_KEY"])

# OpenAI Whisper has a 25 MB file-size limit. 10 minutes of 64 kbps mono mp3 ~= 4.8 MB,
# safely under the limit. Long videos get split into 600-second chunks.
CHUNK_SECONDS = 600


def get_job(job_id: str) -> dict:
    return db.table("jobs").select("*").eq("id", job_id).single().execute().data


def update_job(job_id: str, **fields) -> None:
    db.table("jobs").update({**fields, "updated_at": "now()"}).eq("id", job_id).execute()


def update_session(session_id: str, **fields) -> None:
    db.table("job_sessions").update(fields).eq("id", session_id).execute()


# ---------------------------------------------------------------- credits ---

def get_balance(user_id: str) -> float:
    row = (
        db.table("profiles")
        .select("credits_balance")
        .eq("id", user_id)
        .single()
        .execute()
        .data
    )
    return float(row["credits_balance"]) if row else 0.0


def probe_duration_minutes_cheap(video_url: str) -> Optional[int]:
    """Probe duration WITHOUT downloading. Returns ceil(seconds / 60), or None if
    the source doesn't expose duration in its manifest (CloudFront direct mp4s,
    some Internet Archive items, ...). On None, fall back to ffprobe after download.

    yt-dlp prints the literal string 'NA' for such sources -- float("NA") raises
    ValueError and would kill the worker before it ever reaches Whisper.
    """
    try:
        out = subprocess.check_output(
            ["yt-dlp", "--print", "duration", "--no-warnings", video_url],
            text=True,
            timeout=30,
        ).strip()
    except subprocess.SubprocessError:
        return None
    if not out or out.upper() == "NA":
        return None
    try:
        seconds = float(out.splitlines()[0])
    except ValueError:
        return None
    # Minimum 1 credit even for sub-minute clips; ceil so a 61s clip costs 2.
    return max(1, math.ceil(seconds / 60))


def block_for_insufficient_credits(job: dict, minutes: int, balance: float) -> None:
    """Mark the job and write a zero-amount ledger row explaining why. No Whisper
    call is made, so this path costs the platform nothing."""
    update_job(job["id"], status="insufficient_credits")
    db.table("credit_transactions").insert(
        {
            "user_id": job["user_id"],
            "amount": 0,
            "type": "deduction",
            "description": f"Insufficient credits: video is {minutes} min, you have {int(balance)}",
            "job_id": job["id"],
        }
    ).execute()
    print(
        f"[{job['id']}] insufficient credits — {minutes} min needed, {int(balance)} available",
        flush=True,
    )


def deduct_credits(job: dict, minutes: int) -> float:
    """Ledger row first (source of truth), then the derived balance.

    Known race: two workers for the same user could clobber each other's
    read-then-write. The distributor spawns one worker per job, so for v1 this
    is accepted rather than pushed into a Postgres RPC.
    """
    db.table("credit_transactions").insert(
        {
            "user_id": job["user_id"],
            "amount": -minutes,
            "type": "deduction",
            "description": f"Transcribed {minutes} min video",
            "job_id": job["id"],
        }
    ).execute()

    new_balance = max(0.0, get_balance(job["user_id"]) - minutes)
    db.table("profiles").update({"credits_balance": new_balance}).eq(
        "id", job["user_id"]
    ).execute()
    return new_balance


# ---------------------------------------------------------------- pipeline ---

def download_video(url: str, dest_dir: Path) -> Path:
    """yt-dlp for URLs; pass through for local file paths."""
    # Strip surrounding whitespace first: a leading tab or newline makes the
    # startswith() check below fail, and the URL is then silently treated as a
    # local path -- ffmpeg fails on a nonexistent file and the job stalls.
    url = url.strip()
    if url.startswith(("http://", "https://")):
        out_template = str(dest_dir / "video.%(ext)s")
        subprocess.run(["yt-dlp", "-o", out_template, url], check=True)
        return next(dest_dir.glob("video.*"))
    return Path(url).expanduser().resolve()


def to_mp3(video_path: Path, dest_dir: Path) -> Path:
    """Convert any video/audio container to 64 kbps mono 16 kHz mp3 (Whisper-friendly)."""
    mp3 = dest_dir / "audio.mp3"
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(video_path),
            "-vn", "-ac", "1",
            "-ar", "16000", "-ab", "64k",
            "-acodec", "libmp3lame",
            str(mp3),
        ],
        check=True,
        capture_output=True,
    )
    return mp3


def get_duration_seconds(audio_path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(audio_path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(out.stdout.strip())


def split_chunks(mp3_path: Path, dest_dir: Path) -> list[Path]:
    """Split into CHUNK_SECONDS-second chunks (re-encode to keep sizes predictable)."""
    duration = get_duration_seconds(mp3_path)
    n_chunks = max(1, math.ceil(duration / CHUNK_SECONDS))
    chunks = []
    for i in range(n_chunks):
        chunk = dest_dir / f"chunk_{i:03d}.mp3"
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(mp3_path),
                "-ss", str(i * CHUNK_SECONDS),
                "-t", str(CHUNK_SECONDS),
                "-acodec", "libmp3lame",
                "-ab", "64k",
                str(chunk),
            ],
            check=True,
            capture_output=True,
        )
        chunks.append(chunk)
    return chunks


def transcribe_chunk(chunk_path: Path, language: str) -> str:
    with open(chunk_path, "rb") as f:
        return openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="text",
            language=language,
        )


def fail_job(job_id: str, exc: BaseException) -> None:
    """Record why a claimed job died so the UI can stop spinning.

    Best-effort by design: if this write itself fails we only log it. Re-raising
    here would replace the original traceback with a less useful one.
    """
    message = f"{type(exc).__name__}: {exc}"[:2000]
    try:
        update_job(job_id, status="error", error_message=message)
    except Exception as write_exc:
        print(f"[{job_id}] could not record error state: {write_exc}",
              file=sys.stderr, flush=True)
    print(f"[{job_id}] error — {message}", file=sys.stderr, flush=True)


def run_job(job_id: str) -> None:
    job = get_job(job_id)
    session_id = job["current_session_id"]

    # Claim the job FIRST. Everything below can crash; once the status is off
    # 'pending' the distributor's poll won't re-spawn us into a crash loop.
    update_job(job_id, status="downloading", error_message=None)

    balance = get_balance(job["user_id"])
    minutes = probe_duration_minutes_cheap(job["video_source_url"])

    if minutes is not None and minutes > balance:
        # Free gate: the manifest told us the duration, so we never downloaded
        # a byte and never called Whisper.
        block_for_insufficient_credits(job, minutes, balance)
        return

    print(f"[{job_id}] downloading {job['video_source_url']}", flush=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        video = download_video(job["video_source_url"], tmp_path)

        if minutes is None:
            # No manifest duration (direct mp4 / S3 / CloudFront). We paid for
            # the download, but ffprobe is now exact and Whisper is still ahead.
            minutes = max(1, math.ceil(get_duration_seconds(video) / 60))
            if minutes > balance:
                block_for_insufficient_credits(job, minutes, balance)
                return

        mp3 = to_mp3(video, tmp_path)

        update_job(job_id, status="transcribe")
        chunks = split_chunks(mp3, tmp_path)
        print(f"[{job_id}] transcribing {len(chunks)} chunk(s) — {minutes} credit(s)", flush=True)

        full_text = "\n\n".join(
            transcribe_chunk(c, job["language"]) for c in chunks
        )

        update_session(session_id, subtitle_txt_content=full_text)

        # Deduct only on success. A failed job never costs the user credits.
        new_balance = deduct_credits(job, minutes)
        update_job(job_id, status="done")

    print(
        f"[{job_id}] done — {len(full_text)} chars, -{minutes} credits, balance {new_balance}",
        flush=True,
    )


def main() -> None:
    job_id = os.environ["JOB_ID"]
    try:
        run_job(job_id)
    except Exception as exc:
        # run_job() claims the job before doing anything that can fail, so the
        # distributor (which only polls status='pending') will never re-spawn
        # us. Without this handler a transient yt-dlp / ffmpeg / Whisper error
        # strands the job in 'downloading' forever and the user just watches a
        # spinner. Credits are safe either way: deduct_credits() runs only
        # after Whisper has already succeeded.
        fail_job(job_id, exc)
        raise


if __name__ == "__main__":
    main()
