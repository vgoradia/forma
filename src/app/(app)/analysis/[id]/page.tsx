"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnalysisDetail } from "@/components/analysis-detail";
import { getScan, saveScan } from "@/lib/storage";
import type { ProductAnalysis } from "@/lib/types";
import { generateMockAnalysis } from "@/lib/mock-analysis";
import { PageContainer } from "@/components/page-container";
import { getAnalysisHeroImage, fetchProductImageUrl } from "@/lib/product-images";

function loadScan(id: string): {
  analysis: ProductAnalysis | null;
  imagePreview?: string;
} {
  if (typeof window === "undefined") {
    return { analysis: null };
  }
  const stored = getScan(id);
  if (stored) {
    return { analysis: stored.analysis, imagePreview: stored.imagePreview };
  }
  if (id === "demo") {
    return { analysis: generateMockAnalysis("dress") };
  }
  return { analysis: null };
}

function AnalysisContent({ id }: { id: string }) {
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(
    () => loadScan(id).analysis
  );
  const [imagePreview] = useState<string | undefined>(() => loadScan(id).imagePreview);

  useEffect(() => {
    if (!analysis) return;
    const hero = getAnalysisHeroImage(analysis, imagePreview);
    if (hero) return;

    let cancelled = false;
    void (async () => {
      const imageUrl = await fetchProductImageUrl(analysis);
      if (!imageUrl || cancelled) return;

      const updated = {
        ...analysis,
        identifiedProduct: { ...analysis.identifiedProduct, imageUrl },
        lowestPrice: {
          ...analysis.lowestPrice,
          imageUrl: analysis.lowestPrice.imageUrl ?? imageUrl,
        },
      };
      setAnalysis(updated);

      const stored = getScan(id);
      if (stored) {
        saveScan({ ...stored, analysis: updated });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, analysis, imagePreview]);

  if (!analysis) {
    return (
      <PageContainer>
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <p className="text-sm text-forma-muted">Analysis not found</p>
          <Link href="/scan" className="mt-4 text-sm font-semibold text-forma-primary">
            Start a new scan
          </Link>
        </div>
      </PageContainer>
    );
  }

  return <AnalysisDetail analysis={analysis} imagePreview={imagePreview} scanId={id === "demo" ? undefined : id} />;
}

export default function AnalysisPage() {
  const params = useParams<{ id: string }>();
  return <AnalysisContent key={params.id} id={params.id} />;
}
