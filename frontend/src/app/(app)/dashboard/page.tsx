"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { listProjects, deleteProject } from "@/lib/api";
import type { Project } from "@/types";
import NewProjectModal from "@/components/new-project-modal";
import InlineConfirm from "@/components/ui/inline-confirm";
import WorkspaceHeader, {
  type WorkspaceStat,
} from "@/components/workspace/workspace-header";
import { durations, easings, staggers } from "@/lib/motion";
import { friendlyAgo, parseUtcIso } from "@/lib/time";
import PinButton from "@/components/dashboard/pin-button";
import { useDashboardPins } from "@/lib/use-dashboard-pins";
import DashboardToolbar, {
  type ToolbarChip,
} from "@/components/dashboard/dashboard-toolbar";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Skeleton card shown during loading
function SkeletonCard() {
  return (
    <div className="rounded-[4px] bg-surface-container-lowest p-6 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="h-5 w-3/5 rounded-[2px] bg-surface-container" />
        <div className="h-4 w-8 rounded-[2px] bg-surface-container" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded-[2px] bg-surface-container" />
        <div className="h-3 w-4/5 rounded-[2px] bg-surface-container" />
      </div>
      <div className="mt-6 pt-4">
        <div className="h-3 w-20 rounded-[2px] bg-surface-container" />
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  isPinned: boolean;
  onPinToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function ProjectCard({
  project,
  isPinned,
  onPinToggle,
  onDelete,
}: ProjectCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleDeleteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsConfirming(true);
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      onDelete(project.id);
    } catch {
      setIsDeleting(false);
      setIsConfirming(false);
    }
  }

  return (
    <div className="group relative rounded-[4px] bg-surface-container-lowest transition-all hover:bg-surface-container-low">
      {/* Action cluster: pin + delete */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
        {/* Pin: opacity-100 when pinned, fade-on-hover otherwise */}
        <div
          className={
            isPinned
              ? "opacity-100"
              : "opacity-40 transition-opacity group-hover:opacity-100"
          }
        >
          <PinButton
            isPinned={isPinned}
            onClick={() => onPinToggle(project.id)}
            ariaLabel={
              isPinned ? `Unpin ${project.name}` : `Pin ${project.name}`
            }
          />
        </div>

        {/* Delete: always fade-on-hover */}
        <div className="opacity-40 transition-opacity group-hover:opacity-100">
          {isConfirming ? (
            <div className="rounded-[4px] bg-surface-container-lowest px-2 py-1">
              <InlineConfirm
                message="Delete?"
                onConfirm={handleConfirmDelete}
                onCancel={() => setIsConfirming(false)}
                isSubmitting={isDeleting}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-surface-container-lowest text-on-surface-variant transition-colors hover:text-error"
              aria-label={`Delete project ${project.name}`}
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Card body — navigates to project */}
      <Link
        href={`/project/${project.id}/sources`}
        className="block p-6"
        aria-label={`Open project ${project.name}`}
      >
        <div className="flex items-start justify-between gap-3 pr-16">
          <h2 className="text-lg font-bold text-on-surface transition-colors group-hover:text-secondary">
            {project.name}
          </h2>
        </div>

        {project.description ? (
          <p className="mt-3 text-[13px] leading-relaxed text-on-surface-variant line-clamp-2">
            {project.description}
          </p>
        ) : (
          <p className="mt-3 text-[13px] leading-relaxed italic text-on-surface-variant/50">
            No description
          </p>
        )}

        <div className="mt-5 flex items-center justify-between pt-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
            {formatDate(project.createdAt)}
          </p>
          <svg
            className="h-3.5 w-3.5 text-on-surface-variant transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-secondary"
            fill="none"
            viewBox="0 0 14 14"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path d="M1 7h12M8 2l5 5-5 5" />
          </svg>
        </div>
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const pins = useDashboardPins();

  const [query, setQuery] = useState("");
  const [activeChip, setActiveChip] = useState<ToolbarChip>("all");

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load projects."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  function handleProjectDeleted(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  function handleProjectCreated() {
    fetchProjects();
  }

  const headerStats = useMemo<WorkspaceStat[] | undefined>(() => {
    if (projects.length === 0) return undefined;
    const lastUpdated = projects.reduce(
      (max, p) => (p.updatedAt > max ? p.updatedAt : max),
      projects[0].updatedAt
    );
    return [
      { value: String(projects.length), key: "Total Projects" },
      { value: friendlyAgo(lastUpdated), key: "Last Updated" },
    ];
  }, [projects]);

  const RECENT_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

  const { filteredProjects, counts } = useMemo(() => {
    const now = Date.now();
    const trimmed = query.trim().toLowerCase();
    const searchMatched = trimmed
      ? projects.filter(
          (p) =>
            p.name.toLowerCase().includes(trimmed) ||
            (p.description?.toLowerCase().includes(trimmed) ?? false),
        )
      : projects;

    const recent = searchMatched.filter(
      (p) =>
        now - parseUtcIso(p.updatedAt).getTime() <= RECENT_THRESHOLD_MS,
    );
    const pinned = searchMatched.filter((p) => pins.isPinned(p.id));

    const counts = {
      all: searchMatched.length,
      recent: recent.length,
      pinned: pinned.length,
    };

    let filtered: Project[];
    if (activeChip === "recent") filtered = recent;
    else if (activeChip === "pinned") filtered = pinned;
    else filtered = searchMatched;

    // Pinned-first ordering, then update-time desc within pinned.
    const ts = (p: Project) => parseUtcIso(p.updatedAt).getTime();
    const pinnedSegment = filtered
      .filter((p) => pins.isPinned(p.id))
      .sort((a, b) => ts(b) - ts(a));
    const restSegment = filtered.filter((p) => !pins.isPinned(p.id));

    return {
      filteredProjects: [...pinnedSegment, ...restSegment],
      counts,
    };
  }, [projects, query, activeChip, pins, RECENT_THRESHOLD_MS]);

  function handleClearFilters() {
    setQuery("");
    setActiveChip("all");
  }

  return (
    <>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <WorkspaceHeader
          label="Workspace / Dashboard"
          title="Projects"
          stats={headerStats}
          right={
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-[4px] bg-on-surface px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-secondary"
              aria-label="Create new project"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 14 14"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M7 1v12M1 7h12" />
              </svg>
              New Project
            </button>
          }
        />

        <div className="mt-4">
          <DashboardToolbar
            query={query}
            onQueryChange={setQuery}
            activeChip={activeChip}
            onChipChange={setActiveChip}
            counts={counts}
          />
        </div>

        {/* Content area */}
        <div className="mt-4">
          {/* Loading state — skeleton cards */}
          {isLoading && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className="flex flex-col items-start gap-4 rounded-[4px] bg-error/[0.04] px-8 py-10">
              <div className="flex items-center gap-2">
                <svg
                  className="h-3.5 w-3.5 text-error"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                  />
                </svg>
                <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-error">
                  Error
                </p>
              </div>
              <p className="text-xl font-bold text-on-surface">
                Could not load projects
              </p>
              <p className="text-[13px] text-on-surface-variant">{error}</p>
              <button
                type="button"
                onClick={fetchProjects}
                className="mt-2 rounded-[4px] border border-outline/30 px-5 py-2.5 text-[13px] font-medium text-on-surface transition-colors hover:bg-surface-container-low"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && projects.length === 0 && (
            <div className="flex flex-col items-start gap-4 rounded-[4px] bg-surface-container-lowest px-8 py-12">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">
                Getting started
              </p>
              <h2 className="text-2xl font-bold text-on-surface">
                No projects yet
              </h2>
              <p className="max-w-sm text-[14px] leading-relaxed text-on-surface-variant">
                Create your first project to start analyzing feedback and generating product specs.
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-2 inline-flex items-center gap-2 rounded-[4px] bg-on-surface px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-secondary"
                aria-label="Create first project"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 14 14"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path d="M7 1v12M1 7h12" />
                </svg>
                Create a project
              </button>
            </div>
          )}

          {/* Filtered empty (search/chip excludes everything) */}
          {!isLoading &&
            !error &&
            projects.length > 0 &&
            filteredProjects.length === 0 && (
              <div className="flex flex-col items-start gap-3 rounded-[4px] bg-surface-container-lowest px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[13px] text-on-surface-variant">
                  No projects match{" "}
                  {query.trim() ? (
                    <span className="font-mono text-on-surface">
                      &ldquo;{query.trim()}&rdquo;
                    </span>
                  ) : (
                    "the current filter"
                  )}
                  .
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-[4px] px-3 py-1.5 text-[12px] font-medium text-secondary transition-colors hover:bg-surface-container-low"
                >
                  Clear filters
                </button>
              </div>
            )}

          {/* Project grid */}
          {!isLoading && !error && filteredProjects.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: durations.normal,
                    ease: easings.standard,
                    delay: Math.min(idx * staggers.list, 0.6),
                  }}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
                >
                  <ProjectCard
                    project={project}
                    isPinned={pins.isPinned(project.id)}
                    onPinToggle={pins.toggle}
                    onDelete={handleProjectDeleted}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Project Modal */}
      <AnimatePresence>
        {isModalOpen ? (
          <NewProjectModal
            onClose={() => setIsModalOpen(false)}
            onCreated={handleProjectCreated}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
