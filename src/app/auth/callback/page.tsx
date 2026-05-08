"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileShell } from "@/components/mobile-shell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Finishing secure sign-in...");

  useEffect(() => {
    const run = async () => {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        setMessage("Supabase is not configured.");
        return;
      }

      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage(error.message);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
          if (event === "SIGNED_IN") {
            subscription.unsubscribe();
            router.replace("/profile");
          }
        });

        window.setTimeout(() => {
          subscription.unsubscribe();
          router.replace("/profile");
        }, 1200);

        return;
      }

      router.replace("/profile");
    };

    run();
  }, [router, searchParams]);

  return (
    <MobileShell title="Auth" subtitle="Account sign-in callback" showBackButton backFallbackHref="/login">
      <section className="rounded-2xl border border-[#2a2b2f] bg-[#15171b] p-4 text-sm text-zinc-300">{message}</section>
    </MobileShell>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <MobileShell title="Auth" subtitle="Account sign-in callback" showBackButton backFallbackHref="/login">
          <section className="rounded-2xl border border-[#2a2b2f] bg-[#15171b] p-4 text-sm text-zinc-300">
            Finishing secure sign-in...
          </section>
        </MobileShell>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
