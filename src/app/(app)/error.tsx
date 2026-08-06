"use client";

import { useEffect } from "react";
import { clearAllScans } from "@/lib/storage";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Forma app error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f9fafb] px-6 text-center">
      <div className="max-w-md rounded-3xl border border-forma-border bg-white p-8 shadow-sm">
        <p className="text-lg font-semibold text-gray-900">This page couldn&apos;t load</p>
        <p className="mt-2 text-sm text-forma-muted">
          Something went wrong while loading your data. Try reloading, or reset saved scans if the
          problem continues.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-2xl bg-forma-primary px-5 py-3 text-sm font-semibold text-white"
          >
            Reload
          </button>
          <button
            type="button"
            onClick={() => {
              clearAllScans();
              reset();
            }}
            className="rounded-2xl border border-forma-border bg-white px-5 py-3 text-sm font-semibold text-gray-700"
          >
            Reset saved scans
          </button>
        </div>
      </div>
    </div>
  );
}
