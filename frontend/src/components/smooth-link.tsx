"use client";

import { useRouter } from "next/navigation";

interface SmoothLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export default function SmoothLink({ href, children, className }: SmoothLinkProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    document.documentElement.classList.add("page-exit");
    setTimeout(() => {
      router.push(href);
    }, 250);
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
