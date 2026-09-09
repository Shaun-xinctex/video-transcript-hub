import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/integrations/supabase/client";

type AuthMode = "sign-in" | "sign-up";

export default function AuthPage({ mode }: { mode: AuthMode }) {
  usePageMeta({
    title: mode === "sign-in" ? "Sign in — Video Speed Reader" : "Sign up — Video Speed Reader",
    description: "Sign in or create your Video Speed Reader account.",
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    navigate("/app");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold tracking-tight">Video Speed Reader</span>
          </Link>
        </div>
      </header>

      <main className="hero-ambient flex flex-1 items-center justify-center px-4 py-16">
        <div className="fade-in-up w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "sign-in" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "sign-in"
              ? "Sign in to access your transcripts."
              : "Sign up to start transcribing your videos."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "One moment…" : mode === "sign-in" ? "Sign in / 登入" : "Sign up / 註冊"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "sign-in" ? "New here? " : "Already have an account? "}
            <Link
              to={mode === "sign-in" ? "/sign-up" : "/sign-in"}
              className="font-medium text-primary hover:underline"
            >
              {mode === "sign-in" ? "Create an account" : "Sign in"}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
