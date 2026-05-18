// Browser tab title for the Specs tab.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Specs — Trawl",
};

export default function SpecsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
