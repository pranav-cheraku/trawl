"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface HoveredCitation {
  /** Unique to the message + marker. Used to identify the active guide-line. */
  key: string;
  /** Bounding rect of the badge at hover-enter time, viewport coords. */
  badgeRect: DOMRect;
  /** Bounding rect of the matching chunk card, viewport coords. */
  chunkRect: DOMRect;
}

interface CitationLinkContextValue {
  /** The currently-hovered citation, or null. */
  hoveredCitation: HoveredCitation | null;
  /** Chat side calls this on badge hover/leave, passing badge rect + chunk index. */
  setHoveredCitation: (next: HoveredCitation | null) => void;
  /** X-Ray side registers each chunk's bounding-rect getter under a stable key (the chunkId). */
  registerChunk: (chunkId: string, getRect: () => DOMRect | null) => () => void;
  /** Chat side reads this to look up a chunk's rect by id. Returns null if not registered. */
  getChunkRect: (chunkId: string) => DOMRect | null;
}

const CitationLinkContext = createContext<CitationLinkContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
}

export function CitationLinkProvider({ children }: ProviderProps) {
  const [hoveredCitation, setHoveredCitation] = useState<HoveredCitation | null>(
    null,
  );
  const chunkRectGettersRef = useRef<Map<string, () => DOMRect | null>>(
    new Map(),
  );

  const registerChunk = useCallback(
    (chunkId: string, getRect: () => DOMRect | null) => {
      chunkRectGettersRef.current.set(chunkId, getRect);
      return () => {
        chunkRectGettersRef.current.delete(chunkId);
      };
    },
    [],
  );

  const getChunkRect = useCallback((chunkId: string): DOMRect | null => {
    const getter = chunkRectGettersRef.current.get(chunkId);
    return getter ? getter() : null;
  }, []);

  const value = useMemo<CitationLinkContextValue>(
    () => ({
      hoveredCitation,
      setHoveredCitation,
      registerChunk,
      getChunkRect,
    }),
    [hoveredCitation, registerChunk, getChunkRect],
  );

  return (
    <CitationLinkContext.Provider value={value}>
      {children}
    </CitationLinkContext.Provider>
  );
}

export function useCitationLink(): CitationLinkContextValue {
  const ctx = useContext(CitationLinkContext);
  if (!ctx) {
    // Soft fallback: outside the provider, the hooks no-op so individual
    // components don't crash if mounted without the provider in tests.
    return {
      hoveredCitation: null,
      setHoveredCitation: () => {},
      registerChunk: () => () => {},
      getChunkRect: () => null,
    };
  }
  return ctx;
}
