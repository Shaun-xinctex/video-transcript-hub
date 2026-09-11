import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS — server-only, never import this
 * into a client component.
 *
 * Needed wherever the caller is a machine rather than a signed-in user: the
 * Stripe webhook has no auth cookie, so the cookie-bound client from
 * `@/lib/supabase/server` would fail RLS on the profiles update.
 */
export function createServiceClient() {
  if (!process.env.SUPABASE_SECRET_KEY) {
    throw new Error("SUPABASE_SECRET_KEY is required");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } },
  );
}
