"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-teal text-xs font-medium text-white"
              aria-label="User avatar"
            >
              P
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-ink">
                Pranav
              </p>
              <p className="truncate text-[11px] text-ink-faint">
                pranav@trawl.dev
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 bg-paper">
        <div className="mx-auto max-w-5xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
