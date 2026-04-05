import Link from "next/link";

interface MockProject {
  id: string;
  name: string;
  description: string;
  feedbackCount: number;
  createdAt: string;
}

const mockProjects: MockProject[] = [
  {
    id: "1",
    name: "Notion Mobile",
    description: "iOS app feedback analysis across 342 App Store reviews, focusing on navigation and performance issues.",
    feedbackCount: 342,
    createdAt: "2024-03-15",
  },
  {
    id: "2",
    name: "Slack Desktop",
    description: "Desktop app user reviews covering startup time, notification reliability, and memory usage.",
    feedbackCount: 128,
    createdAt: "2024-03-10",
  },
  {
    id: "3",
    name: "Linear",
    description: "Project management tool feedback from power users on workflow customization and keyboard shortcuts.",
    feedbackCount: 567,
    createdAt: "2024-03-01",
  },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-faint">
            Workspace
          </p>
          <h1 className="mt-1 font-serif text-3xl text-ink">Projects</h1>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 bg-ink px-5 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-ink-light"
          aria-label="Create new project"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={1.5}>
            <path d="M7 1v12M1 7h12" />
          </svg>
          New Project
        </button>
      </div>

      {/* Divider */}
      <div className="mt-6 h-px bg-border" />

      {/* Project grid */}
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {mockProjects.map((project) => (
          <Link
            key={project.id}
            href={`/project/${project.id}/sources`}
            className="group block border border-border bg-white p-6 transition-all hover:border-ink-faint hover:shadow-sm"
            aria-label={`Open project ${project.name}`}
          >
            {/* Top row: name + count */}
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-serif text-lg text-ink group-hover:text-teal transition-colors">
                {project.name}
              </h2>
              <span className="mt-1 flex-shrink-0 text-xs tabular-nums text-ink-faint">
                {project.feedbackCount.toLocaleString()}
              </span>
            </div>

            {/* Description */}
            <p className="mt-3 text-[13px] leading-relaxed text-ink-muted line-clamp-2">
              {project.description}
            </p>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <p className="text-[11px] uppercase tracking-wider text-ink-faint">
                {formatDate(project.createdAt)}
              </p>
              <svg
                className="h-3.5 w-3.5 text-ink-faint transition-all group-hover:translate-x-0.5 group-hover:text-teal"
                fill="none"
                viewBox="0 0 14 14"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M1 7h12M8 2l5 5-5 5" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
