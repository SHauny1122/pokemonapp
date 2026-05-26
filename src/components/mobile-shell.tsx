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

function getFloatingSearchPlaceholder(pathname: string) {
  if (pathname === "/search") {
    return "Search";
  }

  if (pathname === "/collection") {
    return "Search your portfolio";
  }

  return null;
}

function getFloatingSearchTarget(pathname: string) {
  if (pathname === "/search") {
    return "discover-search-input";
  }

  if (pathname === "/collection") {
    return "/search";
  }

  return null;
}

export function MobileShell({
  title,
  subtitle,
  children,
  showBackButton = false,
  backFallbackHref = "/",
}: MobileShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const floatingSearchPlaceholder = getFloatingSearchPlaceholder(pathname);
  const floatingSearchTarget = getFloatingSearchTarget(pathname);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(backFallbackHref);
  };

  const handleFloatingSearch = () => {
    if (floatingSearchTarget === "discover-search-input") {
      const input = document.getElementById("discover-search-input") as HTMLInputElement | null;
      input?.focus();
      return;
    }

    if (floatingSearchTarget) {
      router.push(floatingSearchTarget);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen min-h-dvh w-full max-w-md flex-col bg-[#08090b] text-zinc-100">
      <header
        className="sticky top-0 z-20 border-b border-[#17191d] bg-[#0d0f13]/80 px-4 pb-2 backdrop-blur"
        style={{
          paddingTop: "calc(var(--safe-area-inset-top) + 0.5rem)",
        }}
      >
        <div className="flex items-center gap-2">
          {showBackButton ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#262a31] bg-[#11141a] text-base text-[#7dd3fc]"
            >
              ←
            </button>
          ) : null}

          {floatingSearchPlaceholder ? (
            <button
              type="button"
              onClick={handleFloatingSearch}
              className="flex h-11 flex-1 items-center justify-start rounded-full border border-[#242933] bg-[#10141b]/90 px-3.5 text-sm text-zinc-300"
              aria-label={floatingSearchPlaceholder}
            >
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-[13px] leading-none text-[#7dd3fc]">⌕</span>
              <span className="ml-2 truncate text-left leading-5">{floatingSearchPlaceholder}</span>
            </button>
          ) : (
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight text-white">{title}</h1>
              {subtitle ? <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p> : null}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 pt-4" style={{ paddingBottom: "calc(8rem + var(--safe-area-inset-bottom))" }}>
        {children}
      </main>

      <nav
        className="fixed left-0 right-0 z-30"
        style={{
          bottom: "calc(var(--safe-area-inset-bottom) + 1rem)",
          paddingLeft: "calc(0.75rem + var(--safe-area-inset-left))",
          paddingRight: "calc(0.75rem + var(--safe-area-inset-right))",
        }}
      >
        <div className="mx-auto w-full max-w-md">
          <div className="grid grid-cols-5 rounded-full border border-[#1c2026] bg-[#0f1116]/95 px-1.5 py-1.5">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] transition ${
                  active
                    ? "bg-[#151a22] text-[#7dd3fc]"
                    : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                <span className="text-sm leading-none">{item.icon}</span>
                <span className="leading-none">{item.label}</span>
                {active ? <span className="h-1 w-1 rounded-full bg-[#7dd3fc]" /> : null}
              </Link>
            );
          })}
          </div>
        </div>
      </nav>
    </div>
  );
}
