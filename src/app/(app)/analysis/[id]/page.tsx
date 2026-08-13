"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnalysisDetail } from "@/components/analysis-detail";
import { getScan, saveScan } from "@/lib/storage";
import type { ProductAnalysis } from "@/lib/types";
import { generateMockAnalysis } from "@/lib/mock-analysis";
import { PageContainer } from "@/components/page-container";
import { getAnalysisHeroImage, fetchProductImageUrl } from "@/lib/product-images";
import { trackEvent } from "@/lib/analytics";

function loadScan(id: string): {
  analysis: ProductAnalysis | null;
  imagePreview?: string;
} {
  if (id === "demo") {
    return { analysis: generateMockAnalysis("dress") };
  }
  if (typeof window === "undefined") {
    return { analysis: null };
  }
  const stored = getScan(id);
  if (stored) {
    return { analysis: stored.analysis, imagePreview: stored.imagePreview };
  }
  return { analysis: null };
}

function AnalysisContent({ id }: { id: string }) {
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(
    () => loadScan(id).analysis
  );
  const [imagePreview] = useState<string | undefined>(() => loadScan(id).imagePreview);
  const backfillAttempted = useRef(false);

  useEffect(() => {
    backfillAttempted.current = false;
  }, [id]);

  useEffect(() => {
    if (id === "demo") {
      trackEvent("view_demo");
    }
  }, [id]);

  useEffect(() => {
    if (!analysis || backfillAttempted.current) return;

    const hero = getAnalysisHeroImage(analysis, imagePreview);
    const missingAltIndexes = analysis.alternatives
      .map((alt, index) => (!alt.imageUrl?.trim() ? index : -1))
      .filter((index) => index >= 0);

    if (hero && missingAltIndexes.length === 0) return;

    backfillAttempted.current = true;
    let cancelled = false;

    void (async () => {
      let next = analysis;

      if (!hero) {
        const imageUrl = await fetchProductImageUrl(analysis);
        if (imageUrl && !cancelled) {
          next = {
            ...next,
            identifiedProduct: { ...next.identifiedProduct, imageUrl },
            lowestPrice: {
              ...next.lowestPrice,
              imageUrl: next.lowestPrice.imageUrl ?? imageUrl,
            },
          };
        }
      }

      if (missingAltIndexes.length > 0 && !cancelled) {
        const alternatives = [...next.alternatives];
        await Promise.all(
          missingAltIndexes.map(async (index) => {
            const alt = alternatives[index];
            const imageUrl = await fetchProductImageUrl(next, `${alt.brand} ${alt.name}`);
            if (imageUrl) {
              alternatives[index] = { ...alt, imageUrl };
            }
          })
        );
        next = { ...next, alternatives };
      }

      if (next === analysis || cancelled) return;

      setAnalysis(next);

      if (id !== "demo") {
        const stored = getScan(id);
        if (stored) {
          saveScan({ ...stored, analysis: next });
        }
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
