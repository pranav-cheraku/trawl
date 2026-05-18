// Privacy policy page. Content lives in src/content/legal/privacy.md.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";

import LegalDocument from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy — Trawl",
  description: "Trawl's Privacy Policy — how we collect, use, and protect your data.",
};

const LAST_UPDATED = "May 17, 2026";

export default function PrivacyPage() {
  const markdown = readFileSync(
    join(process.cwd(), "src/content/legal/privacy.md"),
    "utf8",
  );
  return (
    <LegalDocument
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      markdown={markdown}
    />
  );
}
