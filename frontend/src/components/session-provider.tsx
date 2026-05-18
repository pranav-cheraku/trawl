"use client";
// Thin Client Component wrapper for NextAuth SessionProvider. Required because
// SessionProvider uses React context which only works in Client Components, but
// the root layout is a Server Component.

import { SessionProvider } from "next-auth/react";

export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
