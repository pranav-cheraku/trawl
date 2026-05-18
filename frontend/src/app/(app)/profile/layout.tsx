// Browser tab title for the Profile page.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile — Trawl",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
