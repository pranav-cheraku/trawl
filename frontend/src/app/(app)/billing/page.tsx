"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { createCheckoutSession } from "@/lib/api";
import { useCredits } from "@/lib/use-credits";

const TIERS = [
  {
    label: "Starter",
    credits: 100,
    priceCents: 500,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SMALL ?? "",
  },
  {
    label: "Pro",
    credits: 500,
    priceCents: 2000,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_LARGE ?? "",
  },
];

export default function BillingPage() {
  const { balance, refresh } = useCredits();
  const search = useSearchParams();
  const flash = search.get("status");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buy = async (priceId: string) => {
    setPending(priceId);
    setError(null);
    try {
      const { url } = await createCheckoutSession(priceId);
      window.location.href = url;
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Checkout failed");
      setPending(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-on-surface">Credits</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Chat = 1 credit. Generate specs = 5 credits. Build Next = 10 credits.
      </p>

      <div className="mt-4 inline-flex items-center gap-2 rounded-[4px] bg-surface-container-low px-4 py-2 font-mono text-sm">
        <span className="text-[11px] uppercase tracking-wider text-on-surface-variant">
          Current balance
        </span>
        <span className="text-on-surface">{balance ?? "—"}</span>
      </div>

      {flash === "success" && (
        <div className="mt-4 rounded-[4px] bg-secondary/10 px-4 py-2 text-sm text-secondary-dim">
          Payment successful. Your balance will update shortly.
          <button onClick={refresh} className="ml-2 underline">
            Refresh
          </button>
        </div>
      )}
      {flash === "cancelled" && (
        <div className="mt-4 rounded-[4px] bg-error/10 px-4 py-2 text-sm text-error">
          Checkout cancelled.
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-[4px] bg-error/10 px-4 py-2 text-sm text-error">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {TIERS.map((tier) => (
          <div
            key={tier.label}
            className="rounded-[4px] bg-surface-container-lowest p-5 ring-1 ring-outline-variant/30"
          >
            <div className="text-xs uppercase tracking-wider text-on-surface-variant">
              {tier.label}
            </div>
            <div className="mt-2 font-mono text-2xl text-on-surface">
              {tier.credits} credits
            </div>
            <div className="mt-1 font-mono text-sm text-on-surface-variant">
              ${(tier.priceCents / 100).toFixed(2)}
            </div>
            <button
              disabled={pending !== null || !tier.priceId}
              onClick={() => buy(tier.priceId)}
              className="mt-4 w-full rounded-[4px] bg-on-surface py-2 text-sm text-white transition-colors hover:bg-secondary disabled:opacity-50"
            >
              {pending === tier.priceId ? "Redirecting…" : "Buy"}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-on-surface-variant">
        Payments processed via Stripe in test mode. Use any{" "}
        <a
          href="https://stripe.com/docs/testing#cards"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          Stripe test card
        </a>{" "}
        (e.g. 4242 4242 4242 4242).
      </p>
    </div>
  );
}
