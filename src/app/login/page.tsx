import Link from "next/link";
import { Suspense } from "react";
import { LogoWordmark } from "@/components/logo";
import { LoginContent } from "./login-content";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f9fafb]">
      <header className="border-b border-forma-border bg-white px-5 py-4 sm:px-8">
        <Link href="/">
          <LogoWordmark size="md" />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12 sm:px-8">
        <Suspense fallback={<p className="text-sm text-forma-muted">Loading sign in…</p>}>
          <LoginContent />
        </Suspense>
      </main>
    </div>
  );
}
