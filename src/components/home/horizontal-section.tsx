import Link from "next/link";
import { cn } from "@/lib/utils";

export function HorizontalSection({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 lg:mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 lg:text-lg">{title}</h2>
        {href && (
          <Link href={href} className="text-sm font-medium text-forma-primary">
            See all
          </Link>
        )}
      </div>
      <div
        className={cn(
          "flex gap-3 overflow-x-auto pb-1 hide-scrollbar",
          "lg:grid lg:grid-cols-3 lg:overflow-visible xl:grid-cols-4"
        )}
      >
        {children}
      </div>
    </section>
  );
}
