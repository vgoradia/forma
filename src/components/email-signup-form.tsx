"use client";

import { useState, type FormEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Status = { tone: "ok" | "error"; text: string };

export function EmailSignupForm({ source, className }: { source: string; className?: string }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const inputId = `email-signup-${source}`;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setStatus(null);

    try {
      const response = await fetch("/api/email-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        alreadySubscribed?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setStatus({
          tone: "error",
          text: data.error || "We couldn't save that email. Please try again.",
        });
        return;
      }

      if (!data.alreadySubscribed) {
        trackEvent("email_signup", { source });
      }
      setEmail("");
      setStatus({ tone: "ok", text: "You're on the list." });
    } catch {
      setStatus({ tone: "error", text: "We couldn't save that email. Please try again." });
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className={cn("rounded-2xl border border-forma-border bg-white p-4 sm:p-5", className)}
    >
      <label htmlFor={inputId} className="block text-sm font-semibold text-gray-900">
        Get launch deals and weekly buy-or-skip picks
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@email.com"
          className="w-full rounded-xl border border-forma-border bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-stone-600"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-xl bg-forma-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Sending…" : "Sign up"}
        </button>
      </div>
      {status ? (
        <p role="status" className={cn("mt-2 text-xs", status.tone === "ok" ? "text-emerald-800" : "text-red-700")}>
          {status.text}
        </p>
      ) : (
        <p className="mt-2 text-xs text-forma-muted">Optional. We only email Forma updates you asked for.</p>
      )}
    </form>
  );
}
