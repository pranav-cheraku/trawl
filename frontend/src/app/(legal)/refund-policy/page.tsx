import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";

import LegalDocument from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Refund Policy — Trawl",
  description: "Trawl's Refund Policy — how credit purchases and refunds work.",
};

const LAST_UPDATED = "May 17, 2026";

export default function RefundPolicyPage() {
  const markdown = readFileSync(
    join(process.cwd(), "src/content/legal/refund-policy.md"),
    "utf8",
  );
  return (
    <LegalDocument
      title="Refund Policy"
      lastUpdated={LAST_UPDATED}
      markdown={markdown}
    />
  );
}
