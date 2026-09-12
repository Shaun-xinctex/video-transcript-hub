import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Download } from "lucide-react";

import { Brand, SiteFooter } from "@/components/site/Brand";
import { CreditsBadge } from "@/components/site/CreditsBadge";
import { SignOutButton } from "@/components/site/SignOutButton";
import { UploadForm } from "@/components/site/UploadForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Upload — Video Speed Reader",
  description: "Submit a video URL and get a transcript back.",
};

// Always render fresh: the jobs list changes as the worker progresses.
export const dynamic = "force-dynamic";

type JobRow = {
  id: string;
  created_at: string;
  video_source_url: string;
  status: string;
  error_message: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "border-border bg-secondary text-muted-foreground",
  downloading: "border-border bg-secondary text-muted-foreground",
  transcribe: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  done: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  error: "border-destructive/40 bg-destructive/10 text-destructive-foreground",
  insufficient_credits: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

function truncate(value: string, max = 50) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data } = await supabase
    .from("jobs")
    .select("id, created_at, video_source_url, status, error_message")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const jobs = (data ?? []) as JobRow[];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-3">
            <CreditsBadge />
            <Link
              href="/app"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="hero-ambient flex-1 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Existing jobs */}
          <section className="fade-in-up rounded-2xl border border-border bg-card p-8 shadow-2xl">
            <h1 className="text-lg font-semibold tracking-tight">Your transcriptions</h1>

            {jobs.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No transcriptions yet. Submit your first video below.
              </p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Created</th>
                      <th className="py-2 pr-4 font-medium">URL</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 font-medium">Transcript</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs">
                          {truncate(job.video_source_url)}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                              STATUS_STYLES[job.status] ?? STATUS_STYLES["pending"]
                            }`}
                          >
                            {job.status}
                          </span>
                          {job.error_message && (
                            <p className="mt-1.5 max-w-[22rem] text-xs leading-snug text-muted-foreground">
                              {truncate(job.error_message, 140)}
                            </p>
                          )}
                        </td>
                        <td className="py-3">
                          {job.status === "done" ? (
                            <a
                              href={`/api/jobs/${job.id}/transcript`}
                              download={`transcript-${job.id.slice(0, 8)}.txt`}
                              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                            >
                              <Download className="h-3.5 w-3.5" />
                              .txt
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Submission form */}
          <UploadForm />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
