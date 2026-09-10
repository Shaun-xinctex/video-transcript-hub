import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  // 1. Authenticate the caller via the cookie session.
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  if (!body.video_source_url) {
    return NextResponse.json({ error: 'video_source_url required' }, { status: 400 })
  }

  // 2. Use the Supabase Secret key to insert the job + session rows.
  // The user has already been authenticated above; Secret key bypasses RLS
  // so we can insert in one round-trip without policy ping-pong.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const { data: job, error: jobErr } = await admin
    .from('jobs')
    .insert({
      user_id: user.id,
      video_source_url: body.video_source_url,
      topic: body.topic ?? null,
      language: body.language ?? 'zh',
      status: 'pending',
    })
    .select()
    .single()
  if (jobErr) {
    return NextResponse.json({ error: jobErr.message }, { status: 500 })
  }

  const { data: session, error: sessErr } = await admin
    .from('job_sessions')
    .insert({ job_id: job.id, session_number: 1 })
    .select()
    .single()
  if (sessErr) {
    return NextResponse.json({ error: sessErr.message }, { status: 500 })
  }

  await admin
    .from('jobs')
    .update({ current_session_id: session.id })
    .eq('id', job.id)

  return NextResponse.json({ job_id: job.id })
}
