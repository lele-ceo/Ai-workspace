"use client";

// Adaptive scroll hook: auto-pins to stream bottom while the user hasn't
// manually scrolled up. If the user scrolls away, pinning stops and a
// "Jump to latest" affordance should be rendered. Pinning restores only after
// the user scrolls back within THRESHOLD pixels of the bottom.

import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD_PX = 80;

export interface AdaptiveScrollReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** True while the scroll container is within THRESHOLD_PX of the bottom. */
  isPinned: boolean;
  /** Smooth-scroll to the bottom and re-engage pinning. */
  jumpToBottom: () => void;
}

/**
 * @param deps - Values whose change should trigger an auto-scroll when pinned
 *               (e.g. streaming message content).
 */
export function useAdaptiveScroll(deps: unknown[]): AdaptiveScrollReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(true);
  // Track whether the last scroll was user-initiated so a programmatic
  // scrollTop= doesn't incorrectly toggle pinning.
  const programmaticRef = useRef(false);

  const jumpToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    programmaticRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setIsPinned(true);
  }, []);

  // Listen for user scrolls
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      if (programmaticRef.current) {
        programmaticRef.current = false;
        return;
      }
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setIsPinned(distanceFromBottom < THRESHOLD_PX);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll to bottom when pinned and the caller supplies new dependencies.
  // The dependency array itself is the API contract of this hook.
  useEffect(() => {
    if (!isPinned) return;
    const el = containerRef.current;
    if (!el) return;
    programmaticRef.current = true;
    el.scrollTop = el.scrollHeight;
  }, [deps, isPinned]);

  return { containerRef, isPinned, jumpToBottom };
}
