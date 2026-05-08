"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteProject } from "@/lib/api";
import type { Project } from "@/types";
import InlineConfirm from "@/components/ui/inline-confirm";
import PinButton from "@/components/dashboard/pin-button";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ProjectListRowProps {
  project: Project;
  isPinned: boolean;
  onPinToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ProjectListRow({
  project,
  isPinned,
  onPinToggle,
  onDelete,
}: ProjectListRowProps) {
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
    <Link
      href={`/project/${project.id}/sources`}
      className="group block transition-colors hover:bg-surface-container-low"
      aria-label={`Open project ${project.name}`}
    >
      <div
        className="grid grid-cols-[1.6fr_1.4fr_120px_56px_28px] items-center gap-4 px-4 py-3"
        style={{ boxShadow: "inset 0 -1px 0 rgba(15,23,42,0.04)" }}
      >
        {/* Name */}
        <div className="truncate text-[14px] font-semibold text-on-surface group-hover:text-secondary">
          {project.name}
        </div>

        {/* Description */}
        <div className="truncate text-[12px] text-on-surface-variant">
          {project.description ?? (
            <span className="italic text-on-surface-variant/50">
              No description
            </span>
          )}
        </div>

        {/* Updated date */}
        <div className="text-right font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
          {formatDate(project.updatedAt)}
        </div>

        {/* Action cluster: pin + delete */}
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={
              isPinned
                ? "opacity-100"
                : "opacity-0 transition-opacity group-hover:opacity-100"
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
          <div className="opacity-0 transition-opacity group-hover:opacity-100">
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

        {/* → arrow */}
        <svg
          className="h-3.5 w-3.5 justify-self-end text-on-surface-variant transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-secondary"
          fill="none"
          viewBox="0 0 14 14"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path d="M1 7h12M8 2l5 5-5 5" />
        </svg>
      </div>
    </Link>
  );
}
