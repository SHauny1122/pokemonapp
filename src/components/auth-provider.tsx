"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type UserProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  currency: string | null;
  plan: string | null;
  subscription_status: string | null;
  subscription_period: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isSupabaseConfigured: boolean;
  signInWithMagicLink: (email: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const isSupabaseConfigured = Boolean(supabase);

  const getAuthRedirectTo = () => {
    if (typeof window === "undefined") {
      return "";
    }

    const isNativePlatform = Boolean((window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());

    if (isNativePlatform) {
      return "com.smartcollector.app://auth/callback";
    }

    return `${window.location.origin}/auth/callback`;
  };

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!supabase || !nextUser) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, display_name, avatar_url, country, currency, plan, subscription_status, subscription_period"
      )
      .eq("id", nextUser.id)
      .maybeSingle();

    if (error) {
      setProfile(null);
      return;
    }

    setProfile((data as UserProfile | null) ?? null);
  }, [supabase]);

  const syncSession = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    let nextSession = data.session ?? null;

    if (!nextSession) {
      const { data: refreshedData } = await supabase.auth.refreshSession();
      nextSession = refreshedData.session ?? null;
    }

    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    await loadProfile(nextSession?.user ?? null);
    setIsLoading(false);
  }, [loadProfile, supabase]);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      void loadProfile(nextSession?.user ?? null);
      setIsLoading(false);
    });

    const handleSessionRefreshEvent = () => {
      if (!mounted) {
        return;
      }

      void syncSession();
    };

    const handleVisibilityChange = () => {
      if (!mounted || document.visibilityState !== "visible") {
        return;
      }

      void syncSession();
    };

    window.addEventListener("collectiq:auth-session-updated", handleSessionRefreshEvent);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("collectiq:auth-session-updated", handleSessionRefreshEvent);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadProfile, supabase, syncSession]);

  const refreshSession = useCallback(async () => {
    await syncSession();
  }, [syncSession]);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      session,
      profile,
      isLoading,
      isSupabaseConfigured,
      signInWithMagicLink: async (email: string) => {
        if (!supabase) {
          return "Supabase is not configured.";
        }

        const redirectTo = getAuthRedirectTo();
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
          },
        });

        return error?.message ?? null;
      },
      signInWithGoogle: async () => {
        if (!supabase) {
          return "Supabase is not configured.";
        }

        const redirectTo = getAuthRedirectTo();
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
          },
        });

        return error?.message ?? null;
      },
      signOut: async () => {
        if (!supabase) {
          return;
        }

        await supabase.auth.signOut();
      },
      refreshSession,
      refreshProfile,
    };
  }, [isLoading, isSupabaseConfigured, profile, refreshProfile, refreshSession, session, supabase, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
