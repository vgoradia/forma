import Image from "next/image";
import { cn } from "@/lib/utils";

const heights = {
  sm: 36,
  md: 44,
  lg: 56,
} as const;

type LogoSize = keyof typeof heights;

export function LogoMark({
  size = "md",
  className,
  priority = false,
}: {
  size?: LogoSize;
  className?: string;
  priority?: boolean;
}) {
  const h = heights[size];
  return (
    <Image
      src="/forma-icon.png"
      alt="Forma"
      width={h}
      height={h}
      priority={priority}
      className={cn("shrink-0 rounded-xl object-cover object-center", className)}
      style={{ width: h, height: h }}
    />
  );
}

export function LogoWordmark({
  size = "md",
  className,
  showTagline = false,
  priority = false,
}: {
  size?: LogoSize;
  className?: string;
  showTagline?: boolean;
  priority?: boolean;
}) {
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

/** Full logo tile — icon + Forma wordmark from the brand asset. */
export function LogoFull({
  size = "md",
  className,
  priority = false,
}: {
  size?: LogoSize;
  className?: string;
  priority?: boolean;
}) {
  const h = heights[size];
  return (
    <Image
      src="/forma-logo.png"
      alt="Forma"
      width={h}
      height={h}
      priority={priority}
      className={cn("shrink-0 rounded-2xl object-contain", className)}
      style={{ width: h, height: h }}
    />
  );
}

// Back-compat alias used in a few places
export function Logo(props: React.ComponentProps<typeof LogoWordmark>) {
  return <LogoWordmark {...props} />;
}
