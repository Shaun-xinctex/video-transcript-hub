import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const productId = typeof body.product_id === "string" ? body.product_id : "";
  if (!productId) {
    return NextResponse.json({ error: "product_id required" }, { status: 400 });
  }

  const { data: product } = await supabase
    .from("credit_products")
    .select("id, name, credits, stripe_price_id, active")
    .eq("id", productId)
    .single();

  if (!product || !product.active || !product.stripe_price_id) {
    return NextResponse.json({ error: "product not available" }, { status: 400 });
  }

  // Derive the origin from the request so this route works unchanged on the
  // Vercel production URL today and on the custom domain in M3.
  const origin =
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: product.stripe_price_id, quantity: 1 }],
    success_url: `${origin}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/credits`,
    client_reference_id: user.id,
    metadata: {
      user_id: user.id,
      product_id: product.id,
      // Stripe metadata values are always strings. Being explicit about it
      // keeps the webhook's Number() round-trip honest.
      credits: String(product.credits),
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "stripe returned no checkout url" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
