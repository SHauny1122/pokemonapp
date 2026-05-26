"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmailOtpType } from "@supabase/supabase-js";
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
      const tokenHash = searchParams.get("token_hash");
      const otpType = searchParams.get("type");
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token") ?? searchParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token") ?? searchParams.get("refresh_token");
      const authError = searchParams.get("error_description") ?? searchParams.get("error");

      if (authError) {
        setMessage(authError);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage(error.message);
          return;
        }
      } else if (tokenHash && otpType) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType as EmailOtpType,
        });

        if (error) {
          setMessage(error.message);
          return;
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setMessage(error.message);
          return;
        }
      }

      let resolvedSession = (await supabase.auth.getSession()).data.session;

      for (let attempt = 0; attempt < 20 && !resolvedSession; attempt += 1) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 250);
        });

        const { data } = await supabase.auth.getSession();
        resolvedSession = data.session;
      }

      if (!resolvedSession) {
        const { data } = await supabase.auth.refreshSession();
        resolvedSession = data.session ?? null;
      }

      window.dispatchEvent(new Event("collectiq:auth-session-updated"));

      if (!resolvedSession) {
        setMessage("Finishing secure sign-in...");
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
