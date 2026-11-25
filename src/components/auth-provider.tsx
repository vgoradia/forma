"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getAuthSiteOrigin } from "@/lib/app-url";
import { trackEvent } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { withTimeout } from "@/lib/resilience";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const trackedSignups = new Set<string>();

function trackSignupOnce(user: User) {
  const created = Date.parse(user.created_at);
  if (!Number.isFinite(created)) return;
  const lastSignIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : created;
  const justCreated = Date.now() - created < 10 * 60 * 1000 && Math.abs(lastSignIn - created) < 2 * 60 * 1000;
  if (!justCreated || trackedSignups.has(user.id)) return;

  const storageKey = `forma_signup_${user.id}`;
  try {
    if (sessionStorage.getItem(storageKey)) {
      trackedSignups.add(user.id);
      return;
    }
    sessionStorage.setItem(storageKey, "1");
  } catch {
    // Storage can be blocked. The in-memory set still prevents a second event this load.
  }

  trackedSignups.add(user.id);
  trackEvent("signup", { method: "google" });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;

    const supabase = createClient();
    let mounted = true;

    void withTimeout(supabase.auth.getSession(), 4000, "Supabase auth")
      .then(({ data }) => {
        if (mounted) {
          setUser(data.session?.user ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === "SIGNED_IN" && session?.user) {
        trackSignupOnce(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  const signInWithGoogle = useCallback(
    async (redirectTo = "/home") => {
      if (!configured) return;

      const supabase = createClient();
      const origin = getAuthSiteOrigin();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) throw error;
    },
    [configured]
  );

  const signOut = useCallback(async () => {
    if (!configured) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }, [configured]);

  const value = useMemo(
    () => ({ user, loading, configured, signInWithGoogle, signOut }),
    [user, loading, configured, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
