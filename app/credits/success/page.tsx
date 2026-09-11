import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";

import { BalancePoller } from "@/components/site/BalancePoller";
import { Brand, SiteFooter } from "@/components/site/Brand";
import { SignOutButton } from "@/components/site/SignOutButton";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Payment complete — Video Speed Reader",
  description: "Your credits are on the way.",
};

export const dynamic = "force-dynamic";

export default async function CreditsSuccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_balance")
    .eq("id", user.id)
    .single();

  const balance = Number(profile?.credits_balance ?? 0);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <SignOutButton />
        </div>
      </header>

      <main className="hero-ambient flex flex-1 items-center justify-center px-4 py-16">
        <div className="fade-in-up w-full max-w-lg rounded-2xl border border-border bg-card p-10 text-center shadow-2xl">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
            <Check className="h-6 w-6" />
          </span>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Payment complete</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your balance is now <span className="font-semibold text-foreground">{balance}</span>{" "}
            credits.
          </p>

          <BalancePoller initialBalance={balance} />

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/upload"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Transcribe a video
            </Link>
            <Link
              href="/credits"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-6 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to credits
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
