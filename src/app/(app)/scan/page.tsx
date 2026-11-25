import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo";
import { ScanContent } from "./scan-content";

export const metadata: Metadata = pageMetadata({
  path: "/scan",
  title: "Scan a find — Forma",
  description:
    "Upload a screenshot, paste a product link, or describe a piece. Get prices, dupes, and a buy, wait, or skip verdict in seconds.",
});

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="px-5 pt-12 text-sm text-forma-muted">Loading...</div>}>
      <ScanContent />
    </Suspense>
  );
}
