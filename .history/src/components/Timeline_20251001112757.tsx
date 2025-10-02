"use client";

import { useEffect, useMemo, useRef } from "react";
import { DataSet } from "vis-data/peer";
import { Timeline as VisTimeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
import type { Milestone, MilestoneId } from "@/data/catalog";

const BASE_YEAR = 2025;

type TimelineProps = {
  timelineFilter: string;
  onFilterChange: (filter: string) => void;
  milestones: Milestone[];
  itemsPalette: { gradient: string; halo: string }[];
  activeMilestoneId: MilestoneId;
  onSelectMilestone: (id: string) => void;
};

const filters = (
  milestones: Milestone[],
): { id: string; label: string }[] => [
  { id: "all", label: "All milestones" },
  ...milestones.map((milestone) => ({ id: milestone.id, label: milestone.label })),
];

const monthToDate = (month: number) => new Date(BASE_YEAR, month, 1);

export default function Timeline({
  timelineFilter,
  onFilterChange,
  milestones,
  itemsPalette,
  activeMilestoneId,
  onSelectMilestone,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<VisTimeline | null>(null);

  const filteredMilestones = useMemo(() => {
    if (timelineFilter === "all") {
      return milestones;
    }
    return milestones.filter((milestone) => milestone.id === timelineFilter);
  }, [milestones, timelineFilter]);

  const { minMonth, maxMonth } = useMemo(() => {
    return milestones.reduce(
      (acc, milestone) => {
        return {
          min: Math.min(acc.min, milestone.monthRange[0]),
          max: Math.max(acc.max, milestone.monthRange[1]),
        };
      },
      { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
    );
  }, [milestones]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    if (timelineRef.current) {
      timelineRef.current.destroy();
    }

    const items = new DataSet(
      filteredMilestones.map((milestone, index) => {
        const palette = itemsPalette[index % itemsPalette.length];
        const startMonth = milestone.monthRange[0];
        const endMonth = Math.max(milestone.monthRange[1], startMonth + 1);
        const isActive = milestone.id === activeMilestoneId;

        return {
          id: milestone.id,
          content: `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:4px;color:white;padding:14px 18px;border-radius:9999px;background:${palette.gradient};font-family:Inter,sans-serif;font-size:12px;line-height:1.2;">
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.7;">Start ${startMonth} mo</span>
              <span style="font-weight:600;font-size:13px;">${milestone.label}</span>
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.7;">End ${milestone.monthRange[1]} mo</span>
            </div>` +
            (isActive
              ? `<div style="position:absolute;inset:-4px;border-radius:9999px;border:3px solid rgba(99,102,241,0.35);"></div>`
              : ""),
          start: monthToDate(startMonth),
          end: monthToDate(endMonth),
          selectable: true,
        };
      }),
    );

    const options = {
      stack: true,
      selectable: true,
      multiselect: false,
      zoomable: false,
      moveable: false,
      orientation: { axis: "top" as const },
      start: monthToDate(minMonth - 1),
      end: monthToDate(maxMonth + 2),
      margin: { axis: 60, item: 16 },
      tooltip: { followMouse: true },
    };

    const timeline = new VisTimeline(containerRef.current, items, options);
    timelineRef.current = timeline;

    timeline.on("select", (properties) => {
      if (properties.items.length > 0) {
        onSelectMilestone(String(properties.items[0]));
      }
    });

    if (activeMilestoneId) {
      timeline.setSelection(activeMilestoneId, { focus: true });
    }

    return () => {
      timeline.destroy();
    };
  }, [
    filteredMilestones,
    itemsPalette,
    onSelectMilestone,
    minMonth,
    maxMonth,
    activeMilestoneId,
  ]);

  useEffect(() => {
    if (timelineRef.current && activeMilestoneId) {
      timelineRef.current.setSelection(activeMilestoneId, { focus: false });
    }
  }, [activeMilestoneId]);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg/20">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Timeline roadmap</h2>
            <p className="text-sm text-slate-600">
              Track upcoming needs from prenatal prep through age three. Filter milestones or scan the interactive view for sequencing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            {filters(milestones).map((filter) => {
              const isActive = timelineFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => onFilterChange(filter.id)}
                  className={`rounded-full border px-3 py-1 transition ${
                    isActive
                      ? "border-indigo-500 bg-indigo-500 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="timeline-container h-[420px]">
          <div ref={containerRef} className="h-full" />
        </div>
      </section>

      <style jsx global>{`
        .timeline-container .vis-timeline {
          border: none;
          background: transparent;
        }

        .timeline-container .vis-item {
          border: none;
          background: transparent;
        }

        .timeline-container .vis-item-content {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 0;
        }

        .timeline-container .vis-time-axis .vis-text {
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .timeline-container .vis-time-axis .vis-grid.vis-major {
          border-color: rgba(148, 163, 184, 0.2);
        }

        .timeline-container .vis-current-time {
          display: none;
        }
      `}</style>
    </div>
  );
}

