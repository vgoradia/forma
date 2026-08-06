import Image from "next/image";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { mark: 28, full: 96 },
  md: { mark: 36, full: 120 },
  lg: { mark: 44, full: 140 },
} as const;

type LogoSize = keyof typeof sizes;
type LogoVariant = "mark" | "full" | "lockup";

export function Logo({
  variant = "lockup",
  size = "md",
  className,
  priority = false,
  showTagline = true,
}: {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  priority?: boolean;
  showTagline?: boolean;
}) {
  if (variant === "full") {
    return (
      <Image
        src="/forma-logo.png"
        alt="Forma"
        width={sizes[size].full}
        height={sizes[size].full}
        priority={priority}
        className={cn("object-contain", className)}
        style={{ width: sizes[size].full, height: sizes[size].full }}
      />
    );
  }

  if (variant === "mark") {
    const px = sizes[size].mark;
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-[#1A1B26] text-white",
          className
        )}
        style={{ width: px, height: px }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.svg" alt="" aria-hidden className="h-[62%] w-[62%] object-contain" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo variant="mark" size={size} />
      <div className="min-w-0">
        <p className="font-bold leading-none text-gray-900">Forma</p>
        {showTagline ? (
          <p className="mt-0.5 text-xs text-forma-muted">Shopping copilot</p>
        ) : null}
      </div>
    </div>
  );
}

export function LogoMark({
  size = "md",
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  return <Logo variant="mark" size={size} className={className} />;
}

export function LogoWordmark({
  size = "md",
  className,
  showTagline = true,
}: {
  size?: LogoSize;
  className?: string;
  showTagline?: boolean;
}) {
  return <Logo variant="lockup" size={size} className={className} showTagline={showTagline} />;
}
