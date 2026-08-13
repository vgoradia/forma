"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { LogoWordmark } from "@/components/logo";
import { useAuth } from "@/components/auth-provider";

export default function PlusSuccessPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      const timer = setTimeout(() => router.replace("/profile"), 4000);
      return () => clearTimeout(timer);
    }
  }, [loading, user, router]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f9fafb]">
      <header className="border-b border-forma-border bg-white px-5 py-4 sm:px-8">
        <Link href="/">
          <LogoWordmark size="md" />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-12 text-center sm:px-8">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Welcome to Forma Plus</h1>
        <p className="mt-2 text-sm leading-relaxed text-forma-muted">
          Your subscription is active. Unlimited scans and Plus features unlock as we ship them.
        </p>
        <Link
          href="/profile"
          className="mt-8 inline-flex rounded-2xl bg-forma-primary px-6 py-3.5 text-sm font-semibold text-white"
        >
          Go to profile
        </Link>
      </main>
    </div>
  );
}
