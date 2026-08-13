"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, Shirt, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoWordmark } from "@/components/logo";
import { UserAvatar } from "@/components/auth-ui";
import { useUserProfile } from "@/hooks/use-user-profile";
import { FormaPlusNavPromo } from "@/components/forma-plus-cta";
import { useSubscriptionPlan } from "@/hooks/use-subscription-plan";

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
  const profile = useUserProfile();
  const { plan } = useSubscriptionPlan();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-forma-border bg-white lg:flex">
        <Link href="/home" className="border-b border-forma-border px-6 py-5">
          <LogoWordmark size="md" showTagline />
        </Link>
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
          <FormaPlusNavPromo />
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-gray-50"
          >
            <UserAvatar
              size="sm"
              initials={profile.initials}
              avatarUrl={profile.avatarUrl}
              name={profile.displayName}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{profile.displayName}</p>
              <p className="text-xs text-forma-muted">
                {profile.isAuthenticated
                  ? plan === "plus"
                    ? "Forma Plus"
                    : "Signed in"
                  : "Guest · Free plan"}
              </p>
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
