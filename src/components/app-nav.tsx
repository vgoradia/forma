"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, Shirt, Bell, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { GUEST_DISPLAY_NAME, GUEST_INITIALS } from "@/lib/user";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/scan", label: "Scan", icon: Camera },
  { href: "/wardrobe", label: "Wardrobe", icon: Shirt },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
];

function isActive(pathname: string, href: string) {
  if (href === "/home") return pathname === "/home";
  if (href === "/scan") return pathname.startsWith("/scan") || pathname.startsWith("/analysis");
  return pathname.startsWith(href);
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  layout,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  layout: "sidebar" | "bottom";
}) {
  if (layout === "sidebar") {
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-indigo-50 text-forma-primary"
            : "text-forma-muted hover:bg-gray-50 hover:text-gray-900"
        )}
      >
        <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition-colors",
        active ? "text-forma-primary" : "text-forma-muted"
      )}
    >
      <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
      <span className={cn("text-[10px] font-medium", active && "font-semibold")}>{label}</span>
    </Link>
  );
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-forma-border bg-white lg:flex">
        <div className="flex items-center gap-2.5 border-b border-forma-border px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forma-primary text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Forma</p>
            <p className="text-xs text-forma-muted">Shopping copilot</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {tabs.map((tab) => (
            <NavLink
              key={tab.href}
              {...tab}
              active={isActive(pathname, tab.href)}
              layout="sidebar"
            />
          ))}
        </nav>
        <div className="border-t border-forma-border p-4">
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-gray-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-indigo-300 text-xs font-semibold text-indigo-700">
              {GUEST_INITIALS}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{GUEST_DISPLAY_NAME}</p>
              <p className="text-xs text-forma-muted">Free plan</p>
            </div>
          </Link>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-forma-border bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {tabs.map((tab) => (
            <NavLink
              key={tab.href}
              {...tab}
              active={isActive(pathname, tab.href)}
              layout="bottom"
            />
          ))}
        </div>
      </nav>
    </>
  );
}
