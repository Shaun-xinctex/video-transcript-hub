import Link from "next/link";
import { Zap } from "lucide-react";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Zap className="h-4 w-4" />
      </span>
      <span className="text-base font-semibold tracking-tight">Video Speed Reader</span>
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-center px-4 text-sm text-muted-foreground sm:px-6">
        © 2026 Video Speed Reader
      </div>
    </footer>
  );
}
