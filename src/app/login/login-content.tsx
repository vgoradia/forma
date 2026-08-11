"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { GoogleSignInButton } from "@/components/auth-ui";
import { useAuth } from "@/components/auth-provider";

export function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/home";
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace(next.startsWith("/") ? next : "/home");
    }
  }, [loading, user, next, router]);

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">Sign in to Forma</h1>
      <p className="mt-2 text-sm leading-relaxed text-forma-muted">
        Create a free account with Google, or continue as a guest and start scanning right away.
      </p>

      <div className="mt-8 space-y-3">
        <GoogleSignInButton redirectTo={next.startsWith("/") ? next : "/home"} />
        <Link
          href={next.startsWith("/") ? next : "/scan"}
          className="flex w-full items-center justify-center rounded-2xl border border-forma-border bg-white py-3.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Try without signing in
        </Link>
      </div>

      <p className="mt-4 text-center text-xs text-forma-muted">
        Google sign-in creates your account automatically. Scan history saves locally for now.
      </p>
    </>
  );
}
