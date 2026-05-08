"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { MobileShell } from "@/components/mobile-shell";

export default function LoginPage() {
  const { isSupabaseConfigured, signInWithMagicLink, user, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
          <h2 className="mt-2 text-lg font-semibold text-white">Continue with Email</h2>
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
          <Link href="/profile" className="mt-2 inline-flex text-sm text-[#e1b54f]">
            Return to Profile
          </Link>
        </article>
      </section>
    </MobileShell>
  );
}
