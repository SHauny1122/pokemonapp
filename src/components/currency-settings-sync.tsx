"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCurrency } from "@/components/currency-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function CurrencySettingsSync() {
  const { user, isSupabaseConfigured } = useAuth();
  const { selectedCurrencyCode, selectedCurrency } = useCurrency();
  const lastSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const syncKey = `${user.id}:${selectedCurrencyCode}:${selectedCurrency.country}`;

    if (lastSyncedRef.current === syncKey) {
      return;
    }

    lastSyncedRef.current = syncKey;

    const persist = async () => {
      await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            currency: selectedCurrencyCode,
            country: selectedCurrency.country,
          },
          { onConflict: "user_id" }
        );
    };

    void persist();
  }, [isSupabaseConfigured, selectedCurrency.country, selectedCurrencyCode, user]);

  return null;
}
