import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (id !== "demo") {
    return { robots: { index: false, follow: true } };
  }

  return pageMetadata({
    path: "/analysis/demo",
    title: "Sample verdict — Forma",
    description:
      "See a sample Forma verdict with prices, dupes, and a buy, wait, or skip call before you checkout.",
  });
}

export default function AnalysisIdLayout({ children }: { children: ReactNode }) {
  return children;
}
