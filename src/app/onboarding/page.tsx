"use client";

import { useRouter } from "next/navigation";
import {
  Camera,
  Tag,
  Shirt,
  Shield,
} from "lucide-react";
import { onboardingShowcase } from "@/lib/demo-data";
import { completeOnboarding } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/product-image";
import { LogoWordmark } from "@/components/logo";

const features = [
  {
    icon: Camera,
    title: "Identify instantly",
    description: "Find the exact product from a screenshot, Pinterest pin, TikTok clip, or product link.",
  },
  {
    icon: Tag,
    title: "Compare confidently",
    description: "See the lowest price, better alternatives, budget dupes, and price history in one place.",
  },
  {
    icon: Shirt,
    title: "Style it better",
    description: "Get outfit recommendations and wardrobe compatibility before you purchase.",
  },
];

const steps = [
  { title: "Upload", subtitle: "Screenshot, image, or link" },
  { title: "Compare", subtitle: "Retailers, reviews, alternatives" },
  { title: "Decide", subtitle: "Buy with confidence" },
];

export default function OnboardingPage() {
  const router = useRouter();

  const finish = () => {
    completeOnboarding();
    router.push("/home");
  };

  const signIn = () => {
    completeOnboarding();
    router.push("/login?next=/home");
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-5 pt-12 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <LogoWordmark size="lg" showTagline />
          <button onClick={finish} className="text-sm font-medium text-forma-muted hover:text-gray-900">
            Skip
          </button>
        </div>

        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-forma-muted lg:text-base">
          Identify fashion from any screenshot, link, or image — then compare price, quality, and alternatives before you buy.
        </p>

        <div className="mt-6 rounded-3xl border border-forma-border bg-[#f9fafb] p-5 lg:p-8">
          <h2 className="text-lg font-semibold text-gray-900 lg:text-xl">See what&apos;s worth buying</h2>
          <p className="mt-1 text-xs text-forma-muted lg:text-sm">
            Upload a screenshot or paste a link to get product ID, lowest price, reviews, dupes, and outfit ideas.
          </p>
          <div className="mt-4 flex gap-3 overflow-x-auto hide-scrollbar lg:grid lg:grid-cols-3 lg:overflow-visible">
            {onboardingShowcase.map((item) => (
              <div
                key={item.name}
                className="w-44 shrink-0 rounded-2xl border border-forma-border bg-white p-3 lg:w-full lg:shrink"
              >
                <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-medium", item.tagColor)}>
                  {item.tag}
                </span>
                <ProductImage
                  src={item.imageUrl}
                  alt={item.name}
                  className="mt-2 h-20 w-full rounded-xl lg:h-28"
                />
                <p className="mt-2 text-sm font-medium text-gray-900">{item.name}</p>
                <p className="mt-1 text-xs text-emerald-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-forma-border bg-white p-4 lg:flex-col lg:gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                <Icon className="h-5 w-5 text-forma-primary" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-forma-muted lg:text-sm">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 lg:mt-8">
          <h3 className="mb-4 text-center text-sm font-semibold text-gray-900 lg:text-base">How it works</h3>
          <div className="flex items-start justify-between gap-2 lg:max-w-lg lg:mx-auto">
            {steps.map((step, i) => (
              <div key={step.title} className="flex flex-1 flex-col items-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forma-primary text-sm font-bold text-white lg:h-12 lg:w-12">
                  {i + 1}
                </div>
                <p className="mt-2 text-xs font-semibold text-gray-900 lg:text-sm">{step.title}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-forma-muted lg:text-xs">{step.subtitle}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:max-w-md">
          <button
            onClick={finish}
            className="flex-1 rounded-2xl bg-forma-primary py-4 text-sm font-semibold text-white shadow-sm"
          >
            Continue
          </button>
          <button
            onClick={signIn}
            className="flex-1 rounded-2xl border border-forma-border py-4 text-sm font-semibold text-forma-primary"
          >
            Sign in
          </button>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 lg:max-w-2xl">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-xs leading-relaxed text-emerald-800 lg:text-sm">
            <span className="font-semibold">Private by design</span> • Your shopping history and wardrobe stay under your control.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-forma-muted lg:text-sm">
          No spam. No pressure. Just smarter shopping.
        </p>
        <p className="mt-2 pb-10 text-center text-xs text-forma-muted lg:pb-16 lg:text-sm">
          Already have an account?{" "}
          <button onClick={signIn} className="font-semibold text-forma-primary">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
