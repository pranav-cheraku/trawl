"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the profile menu on outside click or Escape
  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isMenuOpen]);

  return (
    <div className="min-h-screen bg-surface">
      {/* Top workspace bar */}
      <header className="bg-surface-container-lowest">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          {/* Left: Logo + breadcrumb nav */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-on-surface">
                <span className="font-mono text-sm font-bold text-surface-container-lowest">T</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-on-surface">
                Trawl
              </span>
            </Link>

            {/* Breadcrumb separator */}
            <span className="text-on-surface-variant/40">/</span>

            {/* Nav links as breadcrumb items */}
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

          {/* Right: User section */}
          <div className="flex items-center gap-3">
            {status === "loading" ? (
              <>
                {/* Desktop skeleton */}
                <div className="hidden items-center gap-2.5 sm:flex">
                  <div className="h-7 w-7 flex-shrink-0 animate-pulse rounded-full bg-surface-container" />
                  <div className="h-2.5 w-20 animate-pulse rounded-[2px] bg-surface-container" />
                </div>
                {/* Mobile skeleton */}
                <div className="h-8 w-8 animate-pulse rounded-full bg-surface-container sm:hidden" />
              </>
            ) : status === "authenticated" && session?.user ? (
              <>
                {/* Desktop: inline avatar + name + sign out */}
                <div className="hidden items-center gap-3 sm:flex">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-white"
                      aria-label="User avatar"
                    >
                      {session.user.name
                        ? session.user.name.charAt(0).toUpperCase()
                        : "?"}
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[13px] font-medium text-on-surface">
                        {session.user.name ?? ""}
                      </p>
                      {session.user.email && (
                        <p className="truncate font-mono text-[10px] text-on-surface-variant">
                          {session.user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[11px] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
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
                </div>

                {/* Mobile: avatar button → dropdown */}
                <div className="relative sm:hidden" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    aria-label="Profile menu"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-[13px] font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-secondary/30"
                  >
                    {session.user.name
                      ? session.user.name.charAt(0).toUpperCase()
                      : "?"}
                  </button>

                  {isMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-50 mt-2 w-60 rounded-[4px] bg-surface-container-lowest/95 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-[12px]"
                    >
                      {/* Identity block */}
                      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-white">
                          {session.user.name
                            ? session.user.name.charAt(0).toUpperCase()
                            : "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-on-surface">
                            {session.user.name ?? ""}
                          </p>
                          {session.user.email && (
                            <p className="truncate font-mono text-[11px] text-on-surface-variant">
                              {session.user.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Sign out */}
                      <div className="px-2 pb-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            signOut({ callbackUrl: "/" });
                          }}
                          role="menuitem"
                          className="flex w-full items-center gap-2 rounded-[4px] px-2 py-2 text-[13px] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
                        >
                          <svg
                            className="h-4 w-4"
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
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main content — no max-w here; each page owns its width */}
      <main className="bg-surface">{children}</main>
    </div>
  );
}
