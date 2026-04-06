"use client";

import { signIn } from "next-auth/react";

interface SignInButtonProps {
  children: React.ReactNode;
  className?: string;
}

export default function SignInButton({ children, className }: SignInButtonProps) {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className={className}
      aria-label="Sign in with Google"
    >
      {children}
    </button>
  );
}
