import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand, SiteFooter } from "@/components/site/Brand";
import { CreditsBadge } from "@/components/site/CreditsBadge";
import { SignOutButton } from "@/components/site/SignOutButton";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — Video Speed Reader",
  description: "Your Video Speed Reader dashboard.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-3">
            <CreditsBadge />
            <Link
              href="/upload"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Upload
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="hero-ambient flex flex-1 items-center justify-center px-4 py-16">
        <div className="fade-in-up w-full max-w-lg rounded-2xl border border-border bg-card p-10 text-center shadow-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Hi {user.email}</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Head to <Link href="/upload" className="font-medium text-primary hover:underline">Upload</Link> to
            turn a video into a transcript.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
