"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { MobileShell } from "@/components/mobile-shell";

export default function LoginPage() {
  const { isSupabaseConfigured, signInWithMagicLink, signInWithGoogle, user, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const emailValid = useMemo(() => email.includes("@") && email.includes("."), [email]);

  const submit = async () => {
    if (!emailValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    const error = await signInWithMagicLink(email.trim());

    if (error) {
      setFeedback(error);
    } else {
      setFeedback("Check your email for a secure sign-in link.");
    }

    setIsSubmitting(false);
  };

  const submitGoogle = async () => {
    if (isGoogleSubmitting) {
      return;
    }

    setIsGoogleSubmitting(true);
    setFeedback(null);
    const error = await signInWithGoogle();

    if (error) {
      setFeedback(error);
      setIsGoogleSubmitting(false);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setIsGoogleSubmitting(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <MobileShell title="Sign In" subtitle="Sync your collection and subscription across devices." showBackButton backFallbackHref="/profile">
      <section className="space-y-4">
        {!isSupabaseConfigured ? (
          <article className="rounded-2xl border border-dashed border-[#4a3e2a] bg-[#1a1610] p-4 text-sm text-amber-200">
            Supabase is not configured yet. Add environment variables to enable account sign-in.
          </article>
        ) : null}

        <article className="rounded-2xl border border-[#2a2b2f] bg-[#15171b] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Account Access</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Sign up or log in</h2>
          <p className="mt-1 text-sm text-zinc-400">Use Google for one-tap access, or continue with email magic link.</p>

          <button
            type="button"
            onClick={() => {
              void submitGoogle();
            }}
            disabled={!isSupabaseConfigured || isGoogleSubmitting}
            className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
              !isSupabaseConfigured || isGoogleSubmitting
                ? "border border-[#35383f] bg-[#171a22] text-zinc-500"
                : "border border-[#363941] bg-[#20242d] text-white"
            }`}
          >
            <span aria-hidden="true">G</span>
            {isGoogleSubmitting ? "Opening Google..." : "Continue with Google"}
          </button>

          <div className="my-4 h-px w-full bg-[#2a2b2f]" />

          <h2 className="text-lg font-semibold text-white">Continue with Email</h2>
          <p className="mt-1 text-sm text-zinc-400">
            We will email you a secure magic link. No password required for this phase.
          </p>

          <label className="mt-4 block text-xs uppercase tracking-[0.16em] text-zinc-400">Email address</label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            inputMode="email"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-2 w-full rounded-xl border border-[#323232] bg-[#0f1012] px-3 py-3 text-sm text-white outline-none ring-[#e1b54f] placeholder:text-zinc-500 focus:ring-2"
          />

          <button
            type="button"
            onClick={submit}
            disabled={!isSupabaseConfigured || !emailValid || isSubmitting}
            className={`mt-3 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold ${
              !isSupabaseConfigured || !emailValid || isSubmitting
                ? "border border-[#35383f] bg-[#171a22] text-zinc-500"
                : "bg-[#e1b54f] text-[#141519]"
            }`}
          >
            {isSubmitting ? "Sending Link..." : "Send Magic Link"}
          </button>

          {feedback ? <p className="mt-2 text-xs text-zinc-300">{feedback}</p> : null}
        </article>

        <article className="rounded-2xl border border-[#2a2b2f] bg-[#15171b] p-4 text-sm text-zinc-300">
          <p>Current session: {isLoading ? "Checking..." : user ? user.email : "Not signed in"}</p>
          <Link href="/search" className="mt-2 inline-flex text-sm text-zinc-300">
            Skip for now
          </Link>
          <Link href="/profile" className="mt-2 inline-flex text-sm text-[#e1b54f]">
            Return to Profile
          </Link>
        </article>
      </section>
    </MobileShell>
  );
}
