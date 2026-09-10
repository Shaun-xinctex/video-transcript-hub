import type { Metadata } from "next";

import { AuthForm } from "@/components/site/AuthForm";
import { Brand } from "@/components/site/Brand";

export const metadata: Metadata = {
  title: "Sign in — Video Speed Reader",
  description: "Sign in or create your Video Speed Reader account.",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Brand />
        </div>
      </header>
      <main className="hero-ambient flex flex-1 items-center justify-center px-4 py-16">
        <AuthForm mode="sign-in" />
      </main>
    </div>
  );
}
