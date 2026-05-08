"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";

type MobileShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showBackButton?: boolean;
  backFallbackHref?: string;
};

const navItems = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/search", label: "Discover", icon: "◉" },
  { href: "/deal-check", label: "Deals", icon: "$" },
  { href: "/collection", label: "Collection", icon: "▣" },
  { href: "/profile", label: "Profile", icon: "◌" },
];

export function MobileShell({
  title,
  subtitle,
  children,
  showBackButton = false,
  backFallbackHref = "/",
}: MobileShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(backFallbackHref);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#0f1012] text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-[#252525] bg-[#121316]/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-start gap-2.5">
          {showBackButton ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#3a3a3a] bg-[#17181d] text-base text-[#e1b54f]"
            >
              ←
            </button>
          ) : null}

          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#e1b54f]">Smart Collector</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">{title}</h1>
          </div>
        </div>
        {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}
      </header>

      <main className="flex-1 px-4 pb-32 pt-4">{children}</main>

      <nav className="fixed bottom-4 left-0 right-0 z-30 px-3">
        <div className="mx-auto w-full max-w-md">
          <div className="grid grid-cols-5 rounded-full border border-[#2b2b2f] bg-[#111216]/94 px-2 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.55)]">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] transition ${
                  active
                    ? "bg-[#1a1b20] text-[#e1b54f] shadow-[0_0_12px_rgba(225,181,79,0.22)]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="text-sm leading-none">{item.icon}</span>
                <span className="leading-none">{item.label}</span>
                {active ? <span className="h-1 w-1 rounded-full bg-[#e1b54f]" /> : null}
              </Link>
            );
          })}
          </div>
        </div>
      </nav>
    </div>
  );
}
