"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import multiMonthPlugin from "@fullcalendar/multimonth";
import interactionPlugin from "@fullcalendar/interaction";
import type { Milestone, MilestoneId } from "@/data/catalog";
import { getDateRangeForMilestone, formatDateForCalendar } from "@/lib/dateCalculations";

type CalendarViewProps = {
  milestones: Milestone[];
  activeMilestoneId: MilestoneId;
  onSelectMilestone: (id: MilestoneId) => void;
  referenceDate: Date;
};

export default function CalendarView({ milestones, activeMilestoneId, onSelectMilestone, referenceDate }: CalendarViewProps) {
  const events = useMemo(
    () =>
      milestones.map((milestone) => {
        const { start, end } = getDateRangeForMilestone(milestone.monthRange, referenceDate);
        return {
          id: milestone.id,
          title: milestone.label,
          start: formatDateForCalendar(start),
          end: formatDateForCalendar(end),
          allDay: true,
          extendedProps: {
            description: milestone.description,
          },
        };
      }),
    [milestones, referenceDate],
  );

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-xl">
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Calendar view</h2>
      <div className="overflow-x-auto">
        <FullCalendar
          plugins={[dayGridPlugin, multiMonthPlugin, interactionPlugin]}
          initialView="multiMonthYear"
          initialDate={formatDateForCalendar(new Date())}
          height={650}
          firstDay={0}
          events={events}
          multiMonthMaxColumns={1}
          multiMonthMinWidth={350}
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
            // Scroll to center on current month
            const fcElement = arg.view.calendar.el;
            const monthElements = fcElement.querySelectorAll('.fc-multimonth-month');
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            monthElements.forEach((el) => {
              const monthTitle = el.querySelector('.fc-multimonth-title')?.textContent || '';
              const currentMonthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });
              
              if (monthTitle.includes(currentMonthName)) {
                setTimeout(() => {
                  el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }, 100);
              }
            });
          }}
          headerToolbar={{
            start: "",
            center: "title",
            end: "",
          }}
          selectable={true}
        />
      </div>
      <style jsx global>{`
        .fc {
          font-family: "Inter", sans-serif;
        }
        .fc .fc-toolbar-title {
          font-size: 20px;
          font-weight: 600;
          color: #0f172a;
        }
        .fc .fc-multimonth-title {
          font-size: 14px;
          font-weight: 600;
          color: #334155;
          padding: 8px 0;
        }
        .fc .fc-multimonth {
          border: none;
        }
        .fc .fc-multimonth-month {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          margin: 8px;
          background: white;
        }
        .fc .fc-daygrid-event {
          border-radius: 4px;
          padding: 2px 6px;
          border: none;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          font-size: 11px;
          font-weight: 600;
          margin: 1px 0;
        }
        .fc .fc-event-active {
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5);
        }
        .fc .fc-col-header-cell {
          background: #f8fafc;
          font-weight: 600;
          color: #64748b;
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}

