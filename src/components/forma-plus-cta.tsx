"use client";

import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { useFormaPlusCheckout } from "@/hooks/use-forma-plus-checkout";
import { getFormaPlusPriceLabel } from "@/lib/stripe/public-config";
import { cn } from "@/lib/utils";

const perks = ["Unlimited scans", "Price-drop alerts", "Wardrobe sync", "Sale predictions"];

function PlusPerkGrid({ light = false }: { light?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
      {perks.map((perk) => (
        <li
          key={perk}
          className={cn(
            "flex items-center gap-2 text-sm font-medium",
            light ? "text-indigo-100" : "text-gray-700"
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
              light ? "bg-violet-500/30 text-violet-200" : "bg-indigo-100 text-forma-primary"
            )}
          >
            ✓
          </span>
          {perk}
        </li>
      ))}
    </ul>
  );
}

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
          "relative overflow-hidden rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 p-5 shadow-xl shadow-indigo-200/50 sm:p-6",
          className
        )}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <LogoMark sizePx={52} className="!rounded-2xl shadow-lg" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Forma Plus</p>
              <p className="mt-0.5 text-lg font-bold text-white sm:text-xl">{title}</p>
              <p className="mt-1 text-sm text-indigo-100">Unlimited scans · alerts · wardrobe sync</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void startCheckout()}
            disabled={pending}
            className="shrink-0 rounded-2xl bg-white px-6 py-4 text-base font-bold text-forma-primary shadow-lg transition hover:scale-[1.02] hover:shadow-xl disabled:opacity-60"
          >
            {pending ? "Redirecting…" : `Upgrade · ${price}`}
          </button>
        </div>
        {message && <p className="relative mt-3 text-sm text-indigo-100">{message}</p>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border-2 border-indigo-300/30 bg-gradient-to-br from-[#1A1B26] via-indigo-950 to-violet-900 p-7 text-white shadow-2xl shadow-indigo-900/30 lg:p-10",
        className
      )}
    >
      <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-indigo-400/15 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
        <LogoMark sizePx={64} className="!rounded-2xl shadow-xl lg:shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-300" />
            <span className="text-sm font-bold uppercase tracking-widest text-violet-200">Forma Plus</span>
          </div>
          <h2 className="text-2xl font-bold leading-tight lg:text-3xl">{title}</h2>
          <p className="mt-3 text-base leading-relaxed text-indigo-100 lg:text-lg">
            Shop smarter on every purchase — unlimited scans, sale alerts, and deeper wardrobe intelligence.
          </p>
          <div className="mt-5">
            <PlusPerkGrid light />
          </div>
          <button
            type="button"
            onClick={() => void startCheckout()}
            disabled={pending}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-forma-primary shadow-xl transition hover:scale-[1.01] hover:shadow-2xl disabled:opacity-60 sm:w-auto"
          >
            {pending ? "Redirecting…" : `Get Forma Plus · ${price}`}
            <ArrowRight className="h-5 w-5" />
          </button>
          <p className="mt-3 text-xs text-indigo-300">Cancel anytime · Secure checkout via Stripe</p>
          {message && <p className="mt-2 text-sm text-violet-200">{message}</p>}
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
      className="mb-3 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-4 text-left shadow-lg transition hover:from-indigo-500 hover:to-violet-600 disabled:opacity-60"
    >
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-yellow-300" />
        <p className="text-sm font-bold text-white">Upgrade to Forma Plus</p>
      </div>
      <p className="mt-1.5 text-xs leading-snug text-indigo-100">
        Unlimited scans · {price}
      </p>
      <p className="mt-2 text-xs font-semibold text-white/90">
        {pending ? "Redirecting…" : "Tap to upgrade →"}
      </p>
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
        "relative mb-8 overflow-hidden rounded-3xl border-2 border-indigo-300/40 bg-gradient-to-br from-[#1A1B26] via-indigo-950 to-violet-900 p-6 shadow-2xl shadow-indigo-900/25 sm:p-8 lg:p-10",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full bg-violet-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 left-1/4 h-28 w-28 rounded-full bg-indigo-400/20 blur-2xl" />

      <div className="relative">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/20 px-3 py-1.5">
          <Sparkles className="h-4 w-4 text-violet-300" />
          <span className="text-xs font-bold uppercase tracking-wider text-violet-200">
            You just saved time — imagine this every time
          </span>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
              Stop guessing. Start deciding smarter.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-indigo-100 sm:text-lg">
              Get unlimited scans, price-drop alerts, wardrobe sync, and priority sale predictions with{" "}
              <span className="font-semibold text-white">Forma Plus</span>.
            </p>
            <div className="mt-5">
              <PlusPerkGrid light />
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3 lg:w-72">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur-sm">
              <p className="text-3xl font-bold text-white">{price.split("/")[0]}</p>
              <p className="text-xs text-indigo-200">per month · cancel anytime</p>
            </div>
            <button
              type="button"
              onClick={() => void startCheckout()}
              disabled={pending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-base font-bold text-forma-primary shadow-xl transition hover:scale-[1.02] hover:shadow-2xl disabled:opacity-60"
            >
              {pending ? "Redirecting…" : "Upgrade to Forma Plus"}
              <ArrowRight className="h-5 w-5" />
            </button>
            <p className="text-center text-[11px] text-indigo-300">Secure checkout · Less than one impulse buy</p>
          </div>
        </div>

        {message && <p className="relative mt-4 text-sm text-violet-200">{message}</p>}
      </div>
    </section>
  );
}

export function FormaPlusMobileSticky() {
  const { isPlus, loading, pending, startCheckout } = useFormaPlusCheckout();
  const price = getFormaPlusPriceLabel();

  if (loading || isPlus) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-3 lg:hidden">
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={pending}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-indigo-300/50 bg-gradient-to-r from-indigo-600 to-violet-700 px-4 py-3.5 shadow-2xl shadow-indigo-900/40 disabled:opacity-60"
      >
        <div className="text-left">
          <p className="text-sm font-bold text-white">Upgrade to Forma Plus</p>
          <p className="text-[11px] text-indigo-100">Unlimited scans · {price}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-xl bg-white px-3 py-2 text-sm font-bold text-forma-primary">
          {pending ? "…" : "Upgrade"}
          <ArrowRight className="h-4 w-4" />
        </span>
      </button>
    </div>
  );
}
