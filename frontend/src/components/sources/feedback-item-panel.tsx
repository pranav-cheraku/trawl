"use client";

import { useCallback, useEffect, useState } from "react";
import { listFeedbackItems } from "@/lib/api";
import type { FeedbackItem } from "@/types";

interface Props {
  projectId: string;
  sourceId: string;
}

const PAGE_SIZE = 50;

export default function FeedbackItemPanel({ projectId, sourceId }: Props) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchItems = useCallback(
    async (currentOffset: number, append: boolean) => {
      setIsLoading(true);
      try {
        const data = await listFeedbackItems(
          projectId,
          sourceId,
          PAGE_SIZE,
          currentOffset
        );
        setItems((prev) => (append ? [...prev, ...data] : data));
        setHasMore(data.length === PAGE_SIZE);
      } catch {
        // Panel is supplementary. Silently ignore fetch errors.
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, sourceId]
  );

  useEffect(() => {
    fetchItems(0, false);
  }, [fetchItems]);

  const handleLoadMore = () => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    fetchItems(newOffset, true);
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="px-4 py-3">
        <div className="h-3 w-48 animate-pulse rounded-[2px] bg-surface-container-high" />
        <div className="mt-2 h-3 w-64 animate-pulse rounded-[2px] bg-surface-container-high" />
        <div className="mt-2 h-3 w-40 animate-pulse rounded-[2px] bg-surface-container-high" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="px-4 py-3 text-[12px] text-on-surface-variant">
        No feedback items yet.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {items.map((item) => {
        const meta = item.metadata;
        const rating = meta.rating as number | undefined;
        const author = meta.author as string | undefined;
        const title = meta.title as string | undefined;

        return (
          <div
            key={item.id}
            className="border-t border-surface-container-high px-4 py-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {title && (
                  <p className="text-[12px] font-medium text-on-surface">
                    {title}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {rating != null && (
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className={`h-2.5 w-2.5 ${
                            i < rating
                              ? "text-secondary"
                              : "text-outline-variant/40"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </span>
                  )}
                  {author && (
                    <span className="font-mono text-[10px] text-on-surface-variant">
                      {author}
                    </span>
                  )}
                </div>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-on-surface-variant">
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>

            <p className="mt-1 text-[12px] leading-relaxed text-on-surface-variant">
              {item.content}
            </p>
          </div>
        );
      })}

      {hasMore && (
        <div className="px-4 py-3">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="text-[11px] font-medium text-secondary hover:underline disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
