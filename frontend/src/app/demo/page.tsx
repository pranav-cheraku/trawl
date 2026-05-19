"use client";
// Demo entry: redirects /demo to /demo/sources if DEMO_PROJECT_ID is configured.
// Sources is the first tab and matches the real app's project entry point.
import { redirect } from "next/navigation";

export default function DemoEntry() {
  const demoProjectId = process.env.NEXT_PUBLIC_DEMO_PROJECT_ID;

  if (!demoProjectId) {
    return (
      <div className="p-6 text-center text-on-surface-variant">
        Demo not configured.
      </div>
    );
  }

  redirect("/demo/sources");
}
