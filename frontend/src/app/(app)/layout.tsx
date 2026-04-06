"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 flex h-screen w-60 flex-shrink-0 flex-col border-r border-border bg-cream">
        {/* Logo */}
        <div className="flex items-center px-6 py-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center bg-ink">
              <span className="font-serif text-sm text-cream">T</span>
            </div>
            <span className="font-serif text-xl tracking-tight text-ink">
              Trawl
            </span>
          </Link>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-border" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Main navigation">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-muted hover:bg-white/60 hover:text-ink"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="mx-5 h-px bg-border" />
        <div className="px-4 py-4">
          {status === "loading" ? (
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 flex-shrink-0 animate-pulse rounded-full bg-border" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-2.5 w-20 animate-pulse bg-border" />
                <div className="h-2 w-28 animate-pulse bg-border" />
              </div>
            </div>
          ) : status === "authenticated" && session?.user ? (
            <>
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-teal text-xs font-medium text-white"
                  aria-label="User avatar"
                >
                  {session.user.name ? session.user.name.charAt(0).toUpperCase() : "?"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {session.user.name ?? ""}
                  </p>
                  <p className="truncate text-[11px] text-ink-faint">
                    {session.user.email ?? ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="mt-2.5 flex items-center gap-1.5 text-[11px] text-ink-faint transition-colors hover:text-ink"
                aria-label="Sign out"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
                  />
                </svg>
                Sign out
              </button>
            </>
          ) : null}
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 bg-paper">
        <div className="mx-auto max-w-5xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
