import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

/**
 * Shared server-side Stripe client.
 *
 * The apiVersion is pinned on purpose: `stripe` floats on ^22.x, and an
 * unpinned client silently follows Stripe's rolling API version — which is how
 * you get a breaking change two months from now with no code change of your own.
 * The cast keeps the pin from fighting whatever literal union the installed SDK
 * ships with.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia" as Stripe.StripeConfig["apiVersion"],
});
