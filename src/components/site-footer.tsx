import Link from "next/link";
import { LogoWordmark } from "@/components/logo";
import { CONTACT_EMAIL, FOOTER_AFFILIATE_DISCLOSURE } from "@/lib/legal";
import { cn } from "@/lib/utils";

const links = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/affiliate-disclosure", label: "Affiliate disclosure" },
] as const;

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t border-forma-border bg-white px-5 py-8 sm:px-8", className)}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="shrink-0">
            <LogoWordmark size="sm" />
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-forma-muted">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-gray-900">
                {link.label}
              </Link>
            ))}
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-gray-900">
              {CONTACT_EMAIL}
            </a>
          </nav>
        </div>
        <p className="text-center text-xs leading-relaxed text-forma-muted sm:text-left">
          {FOOTER_AFFILIATE_DISCLOSURE}
        </p>
        <p className="text-center text-xs text-forma-muted sm:text-left">© 2026 Forma</p>
      </div>
    </footer>
  );
}
