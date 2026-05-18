// Terms of service page. Content lives in src/content/legal/terms.md.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";

import LegalDocument from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Terms of Service — Trawl",
  description: "Trawl's Terms of Service — the rules for using Trawl.",
};

const LAST_UPDATED = "May 17, 2026";

export default function TermsPage() {
  const markdown = readFileSync(
    join(process.cwd(), "src/content/legal/terms.md"),
    "utf8",
  );
  return (
    <LegalDocument
      title="Terms of Service"
      lastUpdated={LAST_UPDATED}
      markdown={markdown}
    />
  );
}
