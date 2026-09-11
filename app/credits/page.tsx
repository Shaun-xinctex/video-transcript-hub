import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

import { Brand, SiteFooter } from "@/components/site/Brand";
import { BuyCreditsButton } from "@/components/site/BuyCreditsButton";
import { SignOutButton } from "@/components/site/SignOutButton";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Credits — Video Speed Reader",
  description: "Your credit balance, purchase options, and transaction history.",
};

// Balance changes as the worker deducts and Stripe credits — never cache.
export const dynamic = "force-dynamic";

type ProductRow = {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  stripe_price_id: string | null;
};

type TransactionRow = {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
};

const TYPE_STYLES: Record<string, string> = {
  purchase: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  signup_bonus: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  deduction: "border-border bg-secondary text-muted-foreground",
  admin_grant: "border-sky-500/40 bg-sky-500/10 text-sky-300",
};

function usd(value: number) {
  return `$${value.toFixed(2)}`;
}

export default async function CreditsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const [{ data: profile }, { data: productData }, { data: txData }] = await Promise.all([
    supabase.from("profiles").select("credits_balance").eq("id", user.id).single(),
    supabase
      .from("credit_products")
      .select("id, name, credits, price_usd, stripe_price_id")
      .eq("active", true)
      .order("price_usd"),
    supabase
      .from("credit_transactions")
      .select("id, amount, type, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const balance = Number(profile?.credits_balance ?? 0);
  const products = (productData ?? []) as ProductRow[];
  const transactions = (txData ?? []) as TransactionRow[];

  // Baseline for the bonus badge is the smallest tier — everything cheaper
  // per credit than that gets a green percentage.
  const baseline = products.reduce<ProductRow | null>(
    (min, p) => (min === null || Number(p.credits) < Number(min.credits) ? p : min),
    null,
  );
  const baselineRate = baseline ? Number(baseline.price_usd) / Number(baseline.credits) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-3">
            <Link
              href="/upload"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Upload
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="hero-ambient flex-1 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Balance */}
          <section className="fade-in-up rounded-2xl border border-border bg-card p-8 shadow-2xl">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Your balance</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">{balance}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              1 credit = 1 minute of video. Partial minutes round up.
            </p>
          </section>

          {/* Tiers */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">Buy credits</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {products.map((product) => {
                const credits = Number(product.credits);
                const price = Number(product.price_usd);
                const rate = price / credits;
                const bonusPct =
                  baselineRate && rate < baselineRate
                    ? Math.round((1 - rate / baselineRate) * 100)
                    : 0;

                return (
                  <div
                    key={product.id}
                    className="fade-in-up flex flex-col rounded-2xl border border-border bg-card p-6 shadow-2xl"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold tracking-tight">{product.name}</h3>
                      {bonusPct > 0 && (
                        <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                          +{bonusPct}%
                        </span>
                      )}
                    </div>
                    <p className="mt-4 text-3xl font-semibold tracking-tight">{usd(price)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {credits} credits · {usd(rate)} each
                    </p>
                    <div className="mt-auto">
                      <BuyCreditsButton productId={product.id} />
                    </div>
                  </div>
                );
              })}
            </div>
            {products.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No credit packs are available right now.
              </p>
            )}
          </section>

          {/* History */}
          <section className="fade-in-up rounded-2xl border border-border bg-card p-8 shadow-2xl">
            <h2 className="text-lg font-semibold tracking-tight">Transaction history</h2>
            {transactions.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">When</th>
                      <th className="py-2 pr-4 font-medium">Type</th>
                      <th className="py-2 pr-4 font-medium">Description</th>
                      <th className="py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const amount = Number(tx.amount);
                      return (
                        <tr key={tx.id} className="border-b border-border/50 last:border-0">
                          <td className="py-3 pr-4 text-muted-foreground">
                            {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                TYPE_STYLES[tx.type] ?? TYPE_STYLES["deduction"]
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {tx.description ?? "—"}
                          </td>
                          <td
                            className={`py-3 text-right font-mono ${
                              amount > 0 ? "text-emerald-300" : "text-muted-foreground"
                            }`}
                          >
                            {amount > 0 ? `+${amount}` : amount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
