// Browser tab title for the Dashboard page.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Trawl",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
