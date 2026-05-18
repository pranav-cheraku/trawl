"use client";
// Authenticated app shell: top nav bar with logo, Dashboard link, credits pill,
// and profile menu. PaywallModal is mounted here so it is available on all
// in-app pages without duplicating it per route.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { CreditBalancePill } from "@/components/billing/credit-balance-pill";
import { PaywallModal } from "@/components/billing/paywall-modal";
import { ProfileMenu } from "@/components/profile/profile-menu";

const navLinks = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
      </svg>
    ),
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-surface-container-lowest">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-on-surface">
                <span className="font-mono text-sm font-bold text-surface-container-lowest">T</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-on-surface">
                Trawl
              </span>
            </Link>

            <span className="text-on-surface-variant/40">/</span>
            <nav className="flex items-center gap-1" aria-label="Main navigation">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 rounded-[4px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      isActive
                        ? "bg-surface-container-low text-on-surface"
                        : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {status === "loading" ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-surface-container" />
            ) : status === "authenticated" && session?.user ? (
              <>
                <CreditBalancePill />
                <ProfileMenu />
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="bg-surface">{children}</main>

      <PaywallModal />
    </div>
  );
}
