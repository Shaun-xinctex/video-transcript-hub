-- M2 follow-up: worker error reporting.
--
-- worker.py claims a job (status -> 'downloading') before doing anything that
-- can fail. If yt-dlp, ffmpeg or Whisper then crashed, the job stayed in that
-- claimed status forever: the distributor only polls status='pending', so it
-- never re-spawned, and the user watched a spinner with no explanation.
--
-- worker.py now catches the failure, sets status='error' and records the reason
-- here. The 'error' value is already allowed by jobs_status_check (added in
-- 20260911000000_m2_credits_system.sql); this only adds somewhere to put the
-- message. Credits are unaffected — deduct_credits() runs only after Whisper
-- has already succeeded.
alter table public.jobs
  add column if not exists error_message text;
