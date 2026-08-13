"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getDisplayImageSrc } from "@/lib/image-proxy";

function ProductImageInner({
  src,
  alt,
  className,
  fallbackClassName = "from-gray-100 to-gray-200",
  fit = "cover",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState(false);
  const [useDirect, setUseDirect] = useState(false);

  const trimmed = src?.trim();
  const isLocal = Boolean(trimmed?.startsWith("data:") || trimmed?.startsWith("/"));
  const isRemote = Boolean(trimmed?.startsWith("http://") || trimmed?.startsWith("https://"));

  let displaySrc: string | undefined;
  if (trimmed && !failed) {
    if (isLocal) {
      displaySrc = trimmed;
    } else if (isRemote) {
      displaySrc = useDirect ? trimmed : getDisplayImageSrc(trimmed);
    } else {
      displaySrc = trimmed;
    }
  }

  const isScreenshot = trimmed?.startsWith("data:") ?? false;
  const objectFit = isScreenshot ? "contain" : fit;

  if (!displaySrc) {
    return (
      <div
        className={cn("bg-gradient-to-br", fallbackClassName, className)}
        role="img"
        aria-label={alt}
      />
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden",
        objectFit === "contain" && "flex items-center justify-center bg-gray-50",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displaySrc}
        alt={alt}
        className={cn(
          "h-full w-full",
          objectFit === "contain" ? "object-contain object-center" : "object-cover object-center"
        )}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          if (isRemote && !useDirect) {
            setUseDirect(true);
            return;
          }
          setFailed(true);
        }}
      />
    </div>
  );
}

export function ProductImage({
  src,
  alt,
  className,
  fallbackClassName,
  fit = "cover",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fit?: "cover" | "contain";
}) {
  return (
    <ProductImageInner
      key={src ?? ""}
      src={src}
      alt={alt}
      className={className}
      fallbackClassName={fallbackClassName}
      fit={fit}
    />
  );
}

export { getAnalysisHeroImage } from "@/lib/product-images";
