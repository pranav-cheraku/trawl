// Demo layout: wraps the entire demo route group with DemoModeProvider and a
// read-only banner. This route is outside the (app) group so no auth is required.
import type { ReactNode } from "react";

import { DemoModeProvider } from "@/lib/demo-mode";

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <DemoModeProvider>
      <div className="min-h-screen bg-surface">
        <div className="bg-on-surface px-4 py-2 text-center text-xs text-white">
          You&apos;re viewing a read-only demo.{" "}
          <a href="/" className="underline hover:text-white/80">
            Sign in
          </a>{" "}
          to try it on your own data.
        </div>
        {children}
      </div>
    </DemoModeProvider>
  );
}
