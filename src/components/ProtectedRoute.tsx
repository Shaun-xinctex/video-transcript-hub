import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AuthenticatedOutletContext = { user: User };

type AuthState =
  { status: "loading" } | { status: "anonymous" } | { status: "authenticated"; user: User };

/**
 * Client-side replacement for the TanStack `_authenticated` route guard.
 * Resolves the Supabase session in the browser, then either renders the
 * nested route or sends the visitor to the sign-in screen.
 */
export function ProtectedRoute() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data.user) {
          setAuth({ status: "anonymous" });
          return;
        }
        setAuth({ status: "authenticated", user: data.user });
      })
      .catch(() => {
        if (!cancelled) setAuth({ status: "anonymous" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (auth.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="sr-only">Loading</span>
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (auth.status === "anonymous") {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  const context: AuthenticatedOutletContext = { user: auth.user };
  return <Outlet context={context} />;
}
