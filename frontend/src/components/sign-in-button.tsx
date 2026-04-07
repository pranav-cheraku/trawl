"use client";

import { signIn } from "next-auth/react";

interface SignInButtonProps {
  children: React.ReactNode;
  className?: string;
}

export default function SignInButton({ children, className }: SignInButtonProps) {
  const handleClick = () => {
    document.documentElement.classList.add("page-exit");
    setTimeout(() => {
      signIn("google", { callbackUrl: "/dashboard" });
    }, 250);
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      aria-label="Sign in with Google"
    >
      {children}
    </button>
  );
}
