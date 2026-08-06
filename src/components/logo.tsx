import { cn } from "@/lib/utils";

const BRAND = {
  icon: "/forma-icon.png",
  logo: "/forma-logo.png",
  wordmark: "/forma-wordmark.png",
} as const;

const markHeights = {
  sm: 36,
  md: 44,
  lg: 56,
} as const;

type LogoSize = keyof typeof markHeights;

type LogoMarkProps = {
  size?: LogoSize;
  /** Override rendered pixel size (width = height). */
  sizePx?: number;
  className?: string;
  priority?: boolean;
};

/** Icon tile — shopping bag mark on brand dark background. */
export function LogoMark({ size = "md", sizePx, className, priority = false }: LogoMarkProps) {
  const h = sizePx ?? markHeights[size];
  return (
    // Native img avoids Next.js image dedup/optimization quirks with repeated logos.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND.icon}
      alt="Forma"
      width={h}
      height={h}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      className={cn("shrink-0 rounded-[22%] object-contain", className)}
      style={{ width: h, height: h }}
    />
  );
}

type LogoWordmarkProps = {
  size?: LogoSize;
  className?: string;
  showTagline?: boolean;
  priority?: boolean;
};

/** Icon tile + Forma wordmark text — used in headers on light backgrounds. */
export function LogoWordmark({
  size = "md",
  className,
  showTagline = false,
  priority = false,
}: LogoWordmarkProps) {
  const titleSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  } as const;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} priority={priority} />
      <div className="min-w-0">
        <p className={cn("font-bold leading-none text-gray-900", titleSizes[size])}>Forma</p>
        {showTagline ? (
          <p className="mt-0.5 text-xs leading-snug text-forma-muted sm:text-sm">Shopping copilot</p>
        ) : null}
      </div>
    </div>
  );
}

/** Full brand lockup from the official logo asset (icon + Forma on dark tile). */
export function LogoFull({ size = "md", className, priority = false }: LogoMarkProps) {
  const h = markHeights[size];
  const w = Math.round(h * 1.01);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND.logo}
      alt="Forma"
      width={w}
      height={h}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      className={cn("shrink-0 rounded-2xl object-contain", className)}
      style={{ width: w, height: h }}
    />
  );
}

export function Logo(props: React.ComponentProps<typeof LogoWordmark>) {
  return <LogoWordmark {...props} />;
}

export { BRAND as logoAssets };
