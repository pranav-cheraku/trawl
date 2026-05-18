// Browser tab title for the Sources tab.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sources — Trawl",
};

export default function SourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
