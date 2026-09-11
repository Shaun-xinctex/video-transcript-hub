"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Stripe's webhook lands a second or two after the browser is redirected back,
 * so the first render of /credits/success often still shows the pre-purchase
 * balance. Refresh the server component a few times until the number moves.
 */
export function BalancePoller({ initialBalance }: { initialBalance: number }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [startBalance] = useState(initialBalance);

  const settled = initialBalance !== startBalance || attempts >= 10;

  useEffect(() => {
    if (settled) return;
    const timer = setTimeout(() => {
      setAttempts((n) => n + 1);
      router.refresh();
    }, 2000);
    return () => clearTimeout(timer);
  }, [attempts, settled, router]);

  if (settled) return null;

  return (
    <p className="mt-4 text-sm text-muted-foreground">
      Waiting for Stripe to confirm the payment…
    </p>
  );
}
