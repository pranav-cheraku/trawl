// Browser tab title for the Credits page.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credits — Trawl",
};

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
