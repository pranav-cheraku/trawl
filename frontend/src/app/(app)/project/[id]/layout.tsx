"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";

const tabs = [
  {
    label: "Sources",
    segment: "sources",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    label: "Explore",
    segment: "explore",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
    ),
  },
  {
    label: "Build Next",
    segment: "build",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    ),
  },
  {
    label: "Specs",
    segment: "specs",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
  },
];

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.id as string;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={1.5}>
          <path d="M13 7H1M6 2L1 7l5 5" />
        </svg>
        All Projects
      </Link>

      {/* Project header */}
      <div className="mt-4">
        <h1 className="text-2xl font-bold text-on-surface">Project</h1>
      </div>

      {/* Workspace tabs — active tab gets 2px secondary top-border */}
      <nav className="mt-6 flex gap-1" aria-label="Project tabs">
        {tabs.map((tab) => {
          const href = `/project/${projectId}/${tab.segment}`;
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={tab.segment}
              href={href}
              className={`inline-flex items-center gap-1.5 rounded-[4px] px-4 py-2.5 text-[13px] font-medium transition-colors ${
                isActive
                  ? "border-t-2 border-secondary bg-surface-container-lowest text-on-surface"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Tab content */}
      <div className="mt-8">{children}</div>
    </div>
  );
}
