"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type DeferredRenderProps = {
  children: ReactNode;
  fallback?: ReactNode;
  /**
   * IntersectionObserver root margin. Defaults to preloading the content when it is within 200px of the viewport.
   */
  rootMargin?: string;
  /**
   * When true, render immediately without waiting for intersection.
   */
  eager?: boolean;
};

/**
 * Defers rendering of expensive client components until their container scrolls into view.
 */
export function DeferredRender({
  children,
  fallback = null,
  rootMargin = "0px 0px 200px 0px",
  eager = false,
}: DeferredRenderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(() => eager);

  useEffect(() => {
    if (shouldRender) {
      return;
    }

    if (eager) {
      setShouldRender(true);
      return;
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, shouldRender, eager]);

  return (
    <div ref={containerRef} aria-busy={!shouldRender} aria-live="polite">
      {shouldRender ? children : fallback}
    </div>
  );
}
