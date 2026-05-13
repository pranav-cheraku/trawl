"use client";

import { useState } from "react";

import EditableTextArea from "@/components/kanban/editable-textarea";

interface EditableListProps {
  items: string[];
  onSave: (next: string[]) => Promise<void>;
  addLabel: string;
  itemAriaLabel: string;
}

export default function EditableList({
  items,
  onSave,
  addLabel,
  itemAriaLabel,
}: EditableListProps) {
  const [pendingNew, setPendingNew] = useState(false);

  async function updateItem(index: number, next: string) {
    const copy = [...items];
    copy[index] = next;
    try {
      await onSave(copy);
    } catch {
      // parent surfaces error via banner
    }
  }

  async function deleteItem(index: number) {
    const copy = items.filter((_, i) => i !== index);
    try {
      await onSave(copy);
    } catch {
      // parent surfaces error via banner
    }
  }

  async function addItem(next: string) {
    if (next.trim().length === 0) {
      setPendingNew(false);
      return;
    }
    try {
      await onSave([...items, next]);
    } catch {
      // parent surfaces error via banner
    } finally {
      setPendingNew(false);
    }
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li key={index} className="group flex items-start gap-3">
          <span
            aria-hidden
            className="mt-[10px] flex h-5 w-7 flex-shrink-0 items-center justify-center font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant/60"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="flex-1 min-w-0">
            <EditableTextArea
              value={item}
              onSave={(next) => updateItem(index, next)}
              ariaLabel={`${itemAriaLabel} ${index + 1}`}
              placeholder={`${itemAriaLabel}`}
              minRows={1}
            />
          </div>
          <button
            type="button"
            onClick={() => deleteItem(index)}
            aria-label={`Delete ${itemAriaLabel} ${index + 1}`}
            className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-[4px] text-on-surface opacity-0 transition-opacity hover:bg-surface-container-high hover:text-error group-hover:opacity-100 focus:opacity-100"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </li>
      ))}
      {pendingNew ? (
        <li className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-[10px] flex h-5 w-7 flex-shrink-0 items-center justify-center font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant/60"
          >
            {String(items.length + 1).padStart(2, "0")}
          </span>
          <div className="flex-1 min-w-0">
            <EditableTextArea
              value=""
              onSave={addItem}
              ariaLabel={`New ${itemAriaLabel}`}
              placeholder={`New ${itemAriaLabel}`}
              minRows={1}
            />
          </div>
        </li>
      ) : (
        <li>
          <button
            type="button"
            onClick={() => setPendingNew(true)}
            className="inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 -mx-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-on-surface transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            <span>Add {addLabel}</span>
          </button>
        </li>
      )}
    </ul>
  );
}
