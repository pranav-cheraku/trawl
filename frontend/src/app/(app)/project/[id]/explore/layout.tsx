// Browser tab title for the Explore tab.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore — Trawl",
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
