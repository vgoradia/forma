import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  className,
  narrow,
}: {
  children: React.ReactNode;
  className?: string;
  /** Use on scan/upload flows for a focused column on desktop */
  narrow?: boolean;
}) {
  return (
    <div
      className={cn(
        "animate-fade-in px-5 pt-12 pb-6 sm:px-6 lg:px-8 lg:pt-8",
        narrow ? "mx-auto max-w-2xl" : "mx-auto max-w-6xl",
        className
      )}
    >
      {children}
    </div>
  );
}
