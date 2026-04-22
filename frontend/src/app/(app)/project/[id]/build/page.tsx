import WorkspaceHeader from "@/components/workspace/workspace-header";

export default function BuildNextPage() {
  return (
    <div className="flex flex-col gap-4">
      <WorkspaceHeader
        label="Workspace / Build Next"
        title="What Should We Build Next?"
      />

      <div className="flex flex-col items-center rounded-[4px] bg-surface-container-lowest px-8 py-16 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-surface-container">
          <svg
            className="h-5 w-5 text-on-surface-variant"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
          </svg>
        </div>
        <h2 className="mt-5 text-lg font-bold text-on-surface">Coming soon</h2>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-on-surface-variant">
          AI-powered multi-query analysis that clusters themes, ranks
          opportunities, and generates prioritized feature specs.
        </p>
      </div>
    </div>
  );
}
