"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type CarouselItem = {
  title: string;
  description: string;
};

type TrustCarouselProps = {
  items: CarouselItem[];
};

export function TrustCarousel({ items }: TrustCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const total = items.length;
  const activeItem = items[activeIndex];

  const updateIndex = useCallback(
    (nextIndex: number, explicitDirection?: 1 | -1) => {
      if (total === 0) {
        return;
      }
      const normalized = (nextIndex + total) % total;
      if (normalized === activeIndex) {
        return;
      }
      const derivedDirection = explicitDirection ?? (normalized > activeIndex ? 1 : -1);
      setDirection(derivedDirection);
      setActiveIndex(normalized);
    },
    [activeIndex, total],
  );

  useEffect(() => {
    if (total <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      updateIndex(activeIndex + 1, 1);
    }, 6000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeIndex, total, updateIndex]);

  if (total === 0) {
    return null;
  }

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label="Trust and safeguarding commitments"
      aria-live="polite"
    >
      <AnimatePresence custom={direction} mode="wait" initial={false}>
        <motion.article
          key={activeItem.title}
          custom={direction}
          initial="enter"
          animate="center"
          exit="exit"
          variants={{
            enter: (dir: 1 | -1) => ({ opacity: 0, x: dir * 80, scale: 0.96 }),
            center: {
              opacity: 1,
              x: 0,
              scale: 1,
              transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
            },
            exit: (dir: 1 | -1) => ({
              opacity: 0,
              x: dir * -80,
              scale: 0.96,
              transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] },
            }),
          }}
          className="relative overflow-hidden rounded-3xl border border-[rgba(111,144,153,0.18)] bg-white/95 p-6 shadow-[0_24px_45px_rgba(111,144,153,0.18)] backdrop-blur"
        >
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(219,236,255,0.55),transparent_70%)]" aria-hidden />
          <div className="relative space-y-4">
            <h3 className="text-xl font-semibold tracking-[-0.015em] text-[var(--dreambaby-text)]">{activeItem.title}</h3>
            <p className="text-sm leading-7 text-[rgba(38,56,70,0.75)]">{activeItem.description}</p>
          </div>
          <div className="pointer-events-none absolute -bottom-10 -right-12 h-40 w-40 rounded-full bg-[var(--baby-primary-200)]/40 blur-3xl" aria-hidden />
        </motion.article>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-center gap-3">
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => updateIndex(index, index > activeIndex ? 1 : -1)}
              className={`rounded-full transition ${
                isActive
                  ? "size-3 bg-[var(--baby-primary-500)]"
                  : "size-2 bg-[var(--baby-neutral-300)] hover:bg-[var(--baby-primary-200)]"
              }`}
              aria-label={`Show commitment ${index + 1}`}
              aria-pressed={isActive}
            />
          );
        })}
      </div>
    </div>
  );
}
