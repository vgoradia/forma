"use client";

import { useRouter } from "next/navigation";
import { Camera, Share2, Tag, Shield, ArrowRight } from "lucide-react";
import { completeOnboarding } from "@/lib/storage";
import { LogoWordmark } from "@/components/logo";

const steps = [
  { icon: Camera, title: "Scan", detail: "Screenshot or product link" },
  { icon: Tag, title: "Verdict", detail: "Buy · Wait · Skip" },
  { icon: Share2, title: "Share", detail: "Before anyone checks out" },
];

export default function OnboardingPage() {
  const router = useRouter();

  const start = () => {
    completeOnboarding();
    router.push("/scan");
  };

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <div className="mx-auto max-w-lg px-5 py-12 sm:px-8">
        <LogoWordmark size="lg" showTagline />

        <h1 className="mt-8 text-2xl font-bold text-gray-900 sm:text-3xl">
          The buy-or-skip button for viral fashion.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-forma-muted sm:text-base">
          See something on TikTok or Pinterest? One scan tells you if it&apos;s worth your money — with
          prices and dupes.
        </p>

        <div className="mt-8 space-y-3">
          {steps.map(({ icon: Icon, title, detail }) => (
            <div
              key={title}
              className="flex items-center gap-4 rounded-2xl border border-forma-border bg-white p-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                <Icon className="h-5 w-5 text-forma-primary" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-forma-muted">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={start}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-forma-primary py-4 text-sm font-semibold text-white shadow-sm"
        >
          Scan my first find
          <ArrowRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            completeOnboarding();
            router.push("/login?next=/scan");
          }}
          className="mt-3 w-full rounded-2xl border border-forma-border bg-white py-3.5 text-sm font-semibold text-forma-primary"
        >
          Sign in with Google
        </button>

        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-xs leading-relaxed text-emerald-800">
            <span className="font-semibold">Private by design.</span> Scans stay on your device until you sign in.
          </p>
        </div>
      </div>
    </div>
  );
}