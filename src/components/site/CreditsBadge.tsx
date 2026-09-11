import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

/**
 * Server-rendered credit balance pill. Re-reads on every server navigation,
 * which is enough — /credits/success polls separately so a fresh purchase
 * feels instant.
 */
export async function CreditsBadge() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_balance")
    .eq("id", user.id)
    .single();

  const balance = Number(profile?.credits_balance ?? 0);
  const low = balance < 1;

  return (
    <Link
      href="/credits"
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        low
          ? "border-destructive/40 bg-destructive/10 text-destructive-foreground hover:bg-destructive/20"
          : "border-border bg-secondary text-muted-foreground hover:text-foreground"
      }`}
    >
      <span>Credits: {balance}</span>
      <span className="text-primary">Buy more</span>
    </Link>
  );
}
