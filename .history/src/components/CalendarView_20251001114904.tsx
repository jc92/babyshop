"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { Milestone, MilestoneId } from "@/data/catalog";
import { getDateRangeForMilestone, formatDateForCalendar } from "@/lib/dateCalculations";

type CalendarViewProps = {
  milestones: Milestone[];
  activeMilestoneId: MilestoneId;
  onSelectMilestone: (id: MilestoneId) => void;
  referenceDate: Date;
};

export default function CalendarView({ milestones, activeMilestoneId, onSelectMilestone }: CalendarViewProps) {
  const events = useMemo(
    () =>
      milestones.map((milestone) => {
        const start = formatMonth(milestone.monthRange[0]);
        const end = formatMonth(milestone.monthRange[1]);
        return {
          id: milestone.id,
          title: milestone.label,
          start,
          end,
          allDay: true,
          extendedProps: {
            description: milestone.description,
          },
        };
      }),
    [milestones],
  );

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-xl">
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Calendar view</h2>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={`${BASE_YEAR}-01-01`}
        height={650}
        firstDay={0}
        events={events}
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          onSelectMilestone(info.event.id as MilestoneId);
        }}
        eventDidMount={(info) => {
          if (info.event.id === activeMilestoneId) {
            info.el.classList.add("fc-event-active");
          }
        }}
        datesSet={(arg) => {
          // focus on start of selected milestone if needed
        }}
        headerToolbar={{
          start: "title",
          center: "",
          end: "prev,next",
        }}
        buttonText={{
          today: "This month",
        }}
        selectable={true}
        dayMaxEventRows={2}
      />
      <style jsx global>{`
        .fc {
          font-family: "Inter", sans-serif;
        }
        .fc .fc-toolbar-title {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
        }
        .fc .fc-button-primary {
          background: #e2e8f0;
          border: none;
          color: #334155;
          border-radius: 9999px;
          padding: 6px 16px;
        }
        .fc .fc-button-primary:hover {
          background: #cbd5f5;
          color: #1d4ed8;
        }
        .fc .fc-daygrid-event {
          border-radius: 9999px;
          padding: 6px 10px;
          border: none;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          font-size: 12px;
          font-weight: 600;
        }
        .fc .fc-event-active {
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.35);
        }
      `}</style>
    </div>
  );
}

