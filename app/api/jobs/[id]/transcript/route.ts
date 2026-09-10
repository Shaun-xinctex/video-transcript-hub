import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // 1. Auth — same pattern as POST /api/jobs.
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

  // 2. Look up the job + verify ownership in one query.
  //    Service-role client bypasses RLS; we re-impose ownership via the WHERE.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
  const { data: job } = await admin
    .from('jobs')
    .select('id, user_id, status, current_session_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!job) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  if (job.status !== 'done' || !job.current_session_id) {
    return NextResponse.json({ error: 'not ready' }, { status: 409 })
  }

  // 3. Pull the transcript text from the current session.
  const { data: session } = await admin
    .from('job_sessions')
    .select('subtitle_txt_content')
    .eq('id', job.current_session_id)
    .single()
  const txt = session?.subtitle_txt_content
  if (!txt) {
    return NextResponse.json({ error: 'transcript missing' }, { status: 500 })
  }

  // 4. Stream it back as a file download.
  const filename = `transcript-${id.slice(0, 8)}.txt`
  return new NextResponse(txt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
