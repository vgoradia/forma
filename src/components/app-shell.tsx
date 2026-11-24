"use client";

import { AppNav } from "./app-nav";
import { SiteFooter } from "@/components/site-footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <AppNav />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <main className="flex-1">{children}</main>
        <SiteFooter className="pb-28 lg:pb-8" />
      </div>
    </div>
  );
}
