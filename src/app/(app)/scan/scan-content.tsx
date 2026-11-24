"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UploadZone } from "@/components/upload-zone";
import type { ProductAnalysis } from "@/lib/types";
import { completeOnboarding, saveScan } from "@/lib/storage";
import { sanitizeProductAnalysis } from "@/lib/scan-validation";
import { PageContainer } from "@/components/page-container";
import { trackEvent } from "@/lib/analytics";
import { canStartScan, recordScanUsage } from "@/lib/scan-quota";
import { ScanQuotaBanner } from "@/components/scan-quota-banner";
import { useSubscriptionPlan } from "@/hooks/use-subscription-plan";

const LOADING_STEPS = [
  "Identifying product...",
  "Comparing prices...",
  "Finding alternatives...",
  "Summarizing reviews...",
];

export function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode");
  const initialQuery = searchParams.get("q") ?? "";

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { plan } = useSubscriptionPlan();
  const isPlus = plan === "plus";

  useEffect(() => {
    completeOnboarding();
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingStep((step) => (step + 1) % LOADING_STEPS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleAnalyze = async (formData: FormData, meta?: { imagePreview?: string }) => {
    if (!canStartScan(isPlus)) {
      setError("You've used all free scans this month. Upgrade to Forma Plus on Profile for unlimited verdicts.");
      return;
    }

    setIsLoading(true);
    setLoadingStep(0);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Analysis failed");
      }

      const data: ProductAnalysis = await res.json();
      const source = formData.has("image")
        ? "upload"
        : formData.has("url")
          ? "link"
          : "search";

      const analysisWithPreview = meta?.imagePreview
        ? {
            ...data,
            identifiedProduct: {
              ...data.identifiedProduct,
              imageUrl: data.identifiedProduct.imageUrl ?? meta.imagePreview,
            },
          }
        : data;

      const analysis = sanitizeProductAnalysis(analysisWithPreview);

      saveScan({
        id: data.id,
        analysis,
        source,
        label:
          source === "upload"
            ? "Image scan"
            : source === "link"
              ? "Product link"
              : String(formData.get("query") ?? "Text search"),
        savedAt: new Date().toISOString(),
        imagePreview: meta?.imagePreview,
      });

      recordScanUsage(isPlus);
      trackEvent("scan_completed", { source, product: data.identifiedProduct.brand });

      router.push(`/analysis/${data.id}`);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Analysis timed out. Try a smaller image or use Describe instead.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  return (
    <PageContainer narrow>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/" className="rounded-xl p-2 text-forma-muted hover:bg-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Get your verdict</h1>
          <p className="text-xs text-forma-muted">Buy, wait, or skip — with prices and dupes</p>
        </div>
      </div>

      <ScanQuotaBanner className="mb-4" />

      <UploadZone
        onAnalyze={handleAnalyze}
        isLoading={isLoading}
        loadingMessage={isLoading ? `${LOADING_STEPS[loadingStep]} Usually 10–20 seconds.` : undefined}
        initialMode={
          initialMode === "link" ? "link" : initialMode === "upload" ? "upload" : initialQuery ? "search" : undefined
        }
        initialQuery={initialQuery}
      />

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-2 text-xs font-semibold text-red-800 underline"
          >
            Dismiss and try again
          </button>
        </div>
      )}
    </PageContainer>
  );
}
