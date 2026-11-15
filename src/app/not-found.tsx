import Link from "next/link";
import { LogoWordmark } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f9fafb] px-6 text-center">
      <Link href="/" className="mb-8">
        <LogoWordmark size="md" />
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-forma-muted">
        That link may be outdated. Try a fresh scan or see the live demo.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/scan"
          className="rounded-2xl bg-forma-primary px-6 py-3 text-sm font-semibold text-white"
        >
          Scan a product
        </Link>
        <Link
          href="/analysis/demo"
          className="rounded-2xl border border-forma-border bg-white px-6 py-3 text-sm font-semibold text-gray-700"
        >
          View demo
        </Link>
      </div>
    </div>
  );
}