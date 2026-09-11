import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // RAW body. Never .json() first — Stripe's signature is computed over the
  // exact byte stream, and JSON round-tripping mutates whitespace.
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) {
    return new NextResponse("no signature", { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return new NextResponse("webhook secret not configured", { status: 500 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("webhook signature verification failed", err);
    return new NextResponse("invalid signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true, unpaid: true });
  }

  const userId = session.metadata?.user_id;
  const productId = session.metadata?.product_id;
  const credits = Number(session.metadata?.credits);
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!userId || !productId || !credits || !paymentIntentId) {
    console.error("missing required fields", { userId, productId, credits, paymentIntentId });
    return new NextResponse("missing metadata", { status: 400 });
  }

  const svc = createServiceClient();

  // 1. Ledger row first — it is the source of truth. The UNIQUE INDEX on
  //    stripe_payment_intent_id is what makes retries idempotent.
  const { error: insertErr } = await svc.from("credit_transactions").insert({
    user_id: userId,
    amount: credits,
    type: "purchase",
    description: `Purchased ${credits} credits`,
    stripe_payment_intent_id: paymentIntentId,
  });

  if (insertErr) {
    // 23505 = unique_violation: we already processed this payment_intent.
    // Return 200 so Stripe stops retrying — this is idempotency working.
    if (insertErr.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("insert failed", insertErr);
    return new NextResponse("db insert failed", { status: 500 });
  }

  // 2. Balance is derived from the ledger.
  const { data: profile } = await svc
    .from("profiles")
    .select("credits_balance")
    .eq("id", userId)
    .single();

  const newBalance = Number(profile?.credits_balance ?? 0) + credits;

  const { error: updateErr } = await svc
    .from("profiles")
    .update({ credits_balance: newBalance })
    .eq("id", userId);

  if (updateErr) {
    console.error("balance update failed", updateErr);
    return new NextResponse("balance update failed", { status: 500 });
  }

  return NextResponse.json({ received: true, credited: credits, balance: newBalance });
}
