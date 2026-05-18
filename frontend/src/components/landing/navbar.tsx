import Link from "next/link";
import SignInButton from "@/components/sign-in-button";
import type { Session } from "next-auth";

export default function Navbar({ session }: { session: Session | null }) {
  return (
    <header className="bg-surface-container-lowest">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4"
        aria-label="Main navigation"
      >
        <Link href="/" className="flex items-center gap-2.5" aria-label="Trawl home">
          <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-on-surface">
            <span className="font-mono text-sm font-bold text-surface-container-lowest">T</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-on-surface">Trawl</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/docs"
            className="hidden text-[13px] text-on-surface-variant transition-colors hover:text-on-surface sm:inline"
          >
            Docs
          </Link>
          {session ? (
            <Link
              href="/dashboard"
              className="rounded-[4px] bg-on-surface px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-secondary"
            >
              Dashboard
            </Link>
          ) : (
            <SignInButton className="rounded-[4px] border border-outline/30 px-4 py-1.5 text-[13px] font-medium text-on-surface transition-colors hover:bg-secondary hover:text-white">
              Sign In
            </SignInButton>
          )}
        </div>
      </nav>
    </header>
  );
}
