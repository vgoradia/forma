"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/auth-provider";
import { profileFromUser, type UserProfile } from "@/lib/user-profile";

export function useUserProfile(): UserProfile & { loading: boolean } {
  const { user, loading } = useAuth();

  const profile = useMemo(() => profileFromUser(user), [user]);

  return { ...profile, loading };
}
