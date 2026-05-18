// Public help/docs page. Reads guide.md at build/request time and renders via LegalDocument.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";

import LegalDocument from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Docs — Trawl",
  description:
    "How Trawl works: connect feedback sources, explore your corpus, and turn it into a prioritized product roadmap.",
};

const LAST_UPDATED = "May 18, 2026";

export default function DocsPage() {
  const markdown = readFileSync(
    join(process.cwd(), "src/content/docs/guide.md"),
    "utf8",
  );
  return (
    <LegalDocument
      title="How Trawl works"
      lastUpdated={LAST_UPDATED}
      markdown={markdown}
    />
  );
}
