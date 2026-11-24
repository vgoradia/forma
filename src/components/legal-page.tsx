import Link from "next/link";
import type { ReactNode } from "react";
import { LogoWordmark } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f9fafb]">
      <header className="border-b border-forma-border bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/">
            <LogoWordmark size="md" />
          </Link>
          <Link href="/scan" className="text-sm font-semibold text-forma-primary">
            Scan
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-8">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {updated ? <p className="mt-1 text-sm text-forma-muted">{updated}</p> : null}
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-700">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}
