import { MobileShell } from "@/components/mobile-shell";

export default function SubscriptionPage() {
  return (
    <MobileShell title="Smart Collector Pro" subtitle="Unlock advanced insights for serious collectors.">
      <section className="space-y-4">
        <article className="rounded-2xl border border-[#3a2e10] bg-gradient-to-b from-[#2a220f] to-[#17140c] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#e1b54f]">Pro Preview</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Subscription Placeholder</h2>
          <p className="mt-2 text-sm text-zinc-300">
            Billing and entitlements come next. This screen anchors the unlock step in the MVP flow.
          </p>
        </article>

        <ul className="space-y-2 text-sm text-zinc-300">
          <li className="rounded-xl border border-[#2c2c2c] bg-[#15161a] px-3 py-2">Advanced Flip Score breakdown</li>
          <li className="rounded-xl border border-[#2c2c2c] bg-[#15161a] px-3 py-2">More complete value history and alerts</li>
          <li className="rounded-xl border border-[#2c2c2c] bg-[#15161a] px-3 py-2">Portfolio insights and top opportunities</li>
        </ul>

        <button
          type="button"
          className="w-full rounded-xl bg-[#e1b54f] px-4 py-3 text-sm font-semibold text-[#141519]"
        >
          Continue to Checkout (Coming Soon)
        </button>
      </section>
    </MobileShell>
  );
}
