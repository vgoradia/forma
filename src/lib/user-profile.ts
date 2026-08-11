import type { User } from "@supabase/supabase-js";
import { GUEST_DISPLAY_NAME, GUEST_INITIALS } from "./user";

export type UserProfile = {
  displayName: string;
  initials: string;
  email?: string;
  avatarUrl?: string;
  isAuthenticated: boolean;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return GUEST_INITIALS;
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function profileFromUser(user: User | null): UserProfile {
  if (!user) {
    return {
      displayName: GUEST_DISPLAY_NAME,
      initials: GUEST_INITIALS,
      isAuthenticated: false,
    };
  }

  const meta = user.user_metadata ?? {};
  const displayName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    user.email?.split("@")[0] ||
    "Forma user";

  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    undefined;

  return {
    displayName,
    initials: initialsFromName(displayName),
    email: user.email ?? undefined,
    avatarUrl,
    isAuthenticated: true,
  };
}

export { GUEST_DISPLAY_NAME, GUEST_INITIALS };
