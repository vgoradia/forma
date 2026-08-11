"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  redirectTo = "/home",
  className,
  label = "Continue with Google",
}: {
  redirectTo?: string;
  className?: string;
  label?: string;
}) {
  const { configured, signInWithGoogle } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!configured) {
    return (
      <p className="text-xs text-forma-muted">
        Google sign-in requires Supabase env vars. See AUTH.md in the repo.
      </p>
    );
  }

  const handleClick = async () => {
    setPending(true);
    setError(null);
    try {
      await signInWithGoogle(redirectTo);
    } catch {
      setError("Could not start Google sign-in. Try again.");
      setPending(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={pending}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-forma-border bg-white px-4 py-3.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin text-forma-muted" /> : <GoogleIcon className="h-5 w-5" />}
        {pending ? "Redirecting…" : label}
      </button>
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function UserAvatar({
  initials,
  avatarUrl,
  name,
  size = "md",
  className,
}: {
  initials: string;
  avatarUrl?: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-9 w-9 text-xs",
    md: "h-14 w-14 text-lg",
    lg: "h-10 w-10 text-xs",
  } as const;

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        className={cn("shrink-0 rounded-full object-cover", sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-indigo-300 font-semibold text-indigo-700",
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
