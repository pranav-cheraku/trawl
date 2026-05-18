import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Build Next — Trawl",
};

export default function BuildLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
