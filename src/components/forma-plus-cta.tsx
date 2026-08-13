"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { useFormaPlusCheckout } from "@/hooks/use-forma-plus-checkout";
import { getFormaPlusPriceLabel } from "@/lib/stripe/public-config";
import { cn } from "@/lib/utils";

const perks = ["Unlimited scans", "Price-drop alerts", "Wardrobe sync", "Priority sale predictions"];

export function FormaPlusBanner({
  variant = "hero",
  headline,
  className,
}: {
  variant?: "hero" | "compact";
  headline?: string;
  className?: string;
}) {
  const { isPlus, loading, pending, message, startCheckout } = useFormaPlusCheckout();
  const price = getFormaPlusPriceLabel();

  if (loading || isPlus) return null;

  const title = headline ?? "Unlock Forma Plus";

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-4 sm:flex-row sm:items-center sm:justify-between",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <LogoMark sizePx={36} />
          <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-forma-muted">Unlimited scans · alerts · wardrobe sync</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void startCheckout()}
          disabled={pending}
          className="shrink-0 rounded-xl bg-forma-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Redirecting…" : `Upgrade · ${price}`}
        </button>
        {message && <p className="text-xs text-violet-700 sm:col-span-2">{message}</p>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-[#1A1B26] via-indigo-950 to-violet-900 p-6 text-white shadow-lg lg:p-8",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <LogoMark sizePx={48} className="!rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <span className="text-xs font-medium uppercase tracking-wider text-violet-200">Forma Plus</span>
          </div>
          <h2 className="text-xl font-bold lg:text-2xl">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-indigo-100">
            Shop smarter on every purchase — unlimited scans, sale alerts, and deeper wardrobe intelligence.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-xs text-indigo-100 lg:text-sm">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-1.5">
                <span className="text-violet-300">✓</span>
                {perk}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => void startCheckout()}
            disabled={pending}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-forma-primary transition hover:shadow-lg disabled:opacity-60"
          >
            {pending ? "Redirecting…" : `Get Forma Plus · ${price}`}
            <ArrowRight className="h-4 w-4" />
          </button>
          {message && <p className="mt-3 text-xs text-violet-200">{message}</p>}
        </div>
      </div>
    </div>
  );
}

export function FormaPlusNavPromo() {
  const { isPlus, loading, pending, startCheckout } = useFormaPlusCheckout();
  const price = getFormaPlusPriceLabel();

  if (loading || isPlus) return null;

  return (
    <button
      type="button"
      onClick={() => void startCheckout()}
      disabled={pending}
      className="mb-3 w-full rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-3 text-left transition hover:border-indigo-200 disabled:opacity-60"
    >
      <p className="text-xs font-semibold text-forma-primary">Upgrade to Plus</p>
      <p className="mt-0.5 text-[10px] text-forma-muted">Unlimited scans · {price}</p>
    </button>
  );
}

export function FormaPlusAnalysisUpsell({ className }: { className?: string }) {
  const { isPlus, loading, pending, message, startCheckout } = useFormaPlusCheckout();
  const price = getFormaPlusPriceLabel();

  if (loading || isPlus) return null;

  return (
    <section
      className={cn(
        "mb-6 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-5 lg:p-6",
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-forma-primary">Want this on every purchase?</p>
      <h2 className="mt-1 text-lg font-bold text-gray-900">Go unlimited with Forma Plus</h2>
      <p className="mt-2 text-sm text-forma-muted">
        Unlimited scans, price-drop alerts, wardrobe sync, and priority sale predictions — {price}.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => void startCheckout()}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-forma-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Redirecting…" : `Upgrade to Forma Plus · ${price}`}
          <ArrowRight className="h-4 w-4" />
        </button>
        <Link
          href="/profile"
          className="inline-flex items-center justify-center rounded-2xl border border-forma-border bg-white px-5 py-3 text-sm font-semibold text-gray-700"
        >
          See what&apos;s included
        </Link>
      </div>
      {message && <p className="mt-2 text-xs text-violet-700">{message}</p>}
    </section>
  );
}
