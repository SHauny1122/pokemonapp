"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
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
  signOut: () => Promise<void>;
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

  const loadProfile = async (nextUser: User | null) => {
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
  };

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      await loadProfile(data.session?.user ?? null);
      setIsLoading(false);
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      void loadProfile(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

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

        const redirectTo = `${window.location.origin}/auth/callback`;
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
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
      refreshProfile: async () => {
        await loadProfile(user);
      },
    };
  }, [isLoading, isSupabaseConfigured, profile, session, supabase, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
