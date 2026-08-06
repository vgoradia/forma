import { AppShell } from "@/components/app-shell";

export default function MainAppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
