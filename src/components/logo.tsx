import Image from "next/image";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { mark: 28, lockup: 32 },
  md: { mark: 36, lockup: 40 },
  lg: { mark: 44, lockup: 52 },
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
        width={512}
        height={512}
        priority={priority}
        className={cn("h-auto w-auto object-contain", className)}
        style={{ height: sizes[size].lockup * 2.5, width: sizes[size].lockup * 2.5 }}
      />
    );
  }

  if (variant === "mark") {
    const px = sizes[size].mark;
    return (
      <Image
        src="/forma-icon.png"
        alt="Forma"
        width={px}
        height={px}
        priority={priority}
        className={cn("shrink-0 rounded-xl object-cover", className)}
        style={{ width: px, height: px }}
      />
    );
  }

  if (!showTagline) {
    const h = sizes[size].lockup;
    return (
      <Image
        src="/forma-logo.png"
        alt="Forma"
        width={h}
        height={h}
        priority={priority}
        className={cn("shrink-0 rounded-xl object-contain", className)}
        style={{ width: h, height: h }}
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo variant="mark" size={size} priority={priority} />
      <div className="min-w-0">
        <p className="font-bold leading-none text-gray-900">Forma</p>
        <p className="mt-0.5 text-xs text-forma-muted">Shopping copilot</p>
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
  return (
    <Logo variant="lockup" size={size} className={className} showTagline={showTagline} />
  );
}
