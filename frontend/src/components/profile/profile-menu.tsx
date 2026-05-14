"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { useCredits } from "@/lib/use-credits";
import { useFloatingPosition } from "@/lib/use-floating-position";
import { useUserMe } from "@/lib/use-user-me";

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { user } = useUserMe();
  const { balance } = useCredits();
  const position = useFloatingPosition({
    isOpen: open,
    triggerRef,
    preferredWidth: 240,
  });

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        popoverRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const id = window.setTimeout(
      () => document.addEventListener("mousedown", onMouseDown),
      0,
    );
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (user?.name ?? "?").charAt(0).toUpperCase();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-[13px] font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-secondary/30"
      >
        {initial}
      </button>
      {open && position && (
        <div
          ref={popoverRef}
          role="menu"
          style={{ position: "fixed", top: position.top, left: position.left, width: position.width }}
          className="z-50 rounded-[4px] bg-surface-container-lowest/95 ring-1 ring-outline-variant/20 backdrop-blur-[12px]"
        >
          <div className="flex items-center gap-3 px-4 pb-3 pt-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-on-surface">
                {user?.name ?? "—"}
              </p>
              {user?.email && (
                <p className="truncate font-mono text-[11px] text-on-surface-variant">
                  {user.email}
                </p>
              )}
            </div>
          </div>

          <Link
            href="/billing"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center justify-between px-4 py-2 text-[13px] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            <span>Credits</span>
            <span className="font-mono text-on-surface">
              {balance !== null ? balance : "—"}
            </span>
          </Link>

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="block px-4 py-2 text-[13px] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            Profile
          </Link>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: "/" });
            }}
            role="menuitem"
            className="block w-full px-4 pb-3 py-2 text-left text-[13px] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            Sign out
          </button>
        </div>
      )}
    </>
  );
}
