import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Zap, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Dashboard — Video Speed Reader" },
      { name: "description", content: "Your Video Speed Reader dashboard." },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold tracking-tight">Video Speed Reader</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="hero-ambient flex flex-1 items-center justify-center px-4 py-16">
        <div className="fade-in-up w-full max-w-lg rounded-2xl border border-border bg-card p-10 text-center shadow-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Hi {user.email}</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Your dashboard is coming soon. Upload functionality will be added in the next milestone.
          </p>
        </div>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-center px-4 text-sm text-muted-foreground sm:px-6">
          © 2026 Video Speed Reader
        </div>
      </footer>
    </div>
  );
}
