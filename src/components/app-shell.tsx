"use client";

import { AppNav } from "./app-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <AppNav />
      <main className="min-h-screen lg:pl-64">
        <div className="pb-24 lg:pb-8">{children}</div>
      </main>
    </div>
  );
}
