"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listProjects, deleteProject } from "@/lib/api";
import type { Project } from "@/types";
import NewProjectModal from "@/components/new-project-modal";

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
  onDelete: (id: string) => void;
}

function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleDeleteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsConfirming(true);
  }

  function handleCancelDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsConfirming(false);
  }

  async function handleConfirmDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
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
      {/* Delete controls — always visible on hover */}
      <div className="absolute right-3 top-3 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        {isConfirming ? (
          <div
            className="flex items-center gap-1.5 rounded-[4px] bg-surface-container-lowest px-2 py-1 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] text-on-surface-variant">Delete?</span>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="text-[11px] font-medium text-error hover:text-error/80 disabled:opacity-50"
              aria-label="Confirm delete"
            >
              {isDeleting ? "Deleting..." : "Yes"}
            </button>
            <span className="text-on-surface-variant/40">/</span>
            <button
              type="button"
              onClick={handleCancelDelete}
              className="text-[11px] font-medium text-on-surface-variant hover:text-on-surface"
              aria-label="Cancel delete"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDeleteClick}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-surface-container-lowest text-on-surface-variant transition-colors hover:text-error shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
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

      {/* Card body — navigates to project */}
      <Link
        href={`/project/${project.id}/sources`}
        className="block p-6"
        aria-label={`Open project ${project.name}`}
      >
        {/* Top row: name */}
        <div className="flex items-start justify-between gap-3 pr-8">
          <h2 className="text-lg font-bold text-on-surface transition-colors group-hover:text-secondary">
            {project.name}
          </h2>
        </div>

        {/* Description */}
        {project.description ? (
          <p className="mt-3 text-[13px] leading-relaxed text-on-surface-variant line-clamp-2">
            {project.description}
          </p>
        ) : (
          <p className="mt-3 text-[13px] leading-relaxed text-on-surface-variant/50 italic">
            No description
          </p>
        )}

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between pt-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
            {formatDate(project.createdAt)}
          </p>
          <svg
            className="h-3.5 w-3.5 text-on-surface-variant transition-all group-hover:translate-x-0.5 group-hover:text-secondary"
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

  return (
    <>
      <div>
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">
              Workspace
            </p>
            <h1 className="mt-1 text-3xl font-bold text-on-surface">Projects</h1>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-[4px] bg-on-surface px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-secondary"
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
        </div>

        {/* Content area */}
        <div className="mt-8">
          {/* Loading state — skeleton cards */}
          {isLoading && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className="flex flex-col items-start gap-4 rounded-[4px] bg-surface-container-lowest px-8 py-10">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">
                Error
              </p>
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

          {/* Project grid */}
          {!isLoading && !error && projects.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={handleProjectDeleted}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleProjectCreated}
      />
    </>
  );
}
