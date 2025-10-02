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
      <div className="overflow-x-auto scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
        <FullCalendar
          plugins={[dayGridPlugin, multiMonthPlugin, interactionPlugin]}
          initialView="multiMonthYear"
          initialDate={formatDateForCalendar(new Date())}
          validRange={dateRange}
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
        .overflow-x-auto::-webkit-scrollbar {
          height: 8px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .fc {
          font-family: "Inter", sans-serif;
        }
        .fc .fc-toolbar {
          margin-bottom: 1.5rem;
        }
        .fc .fc-toolbar-title {
          font-size: 20px;
          font-weight: 600;
          color: #0f172a;
        }
        .fc .fc-multimonth-title {
          font-size: 15px;
          font-weight: 600;
          color: #334155;
          padding: 12px;
          background: #f8fafc;
          text-align: center;
        }
        .fc .fc-multimonth {
          border: none;
          display: flex !important;
          flex-direction: row !important;
          gap: 1rem;
          padding: 0.5rem 0;
        }
        .fc .fc-multimonth-month {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          flex-shrink: 0;
          min-width: 350px;
        }
        .fc .fc-multimonth-month:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: box-shadow 0.2s ease;
        }
        .fc .fc-daygrid-event {
          border-radius: 6px;
          padding: 4px 8px;
          border: none;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          font-size: 11px;
          font-weight: 600;
          margin: 2px 1px;
          cursor: pointer;
        }
        .fc .fc-daygrid-event:hover {
          opacity: 0.9;
        }
        .fc .fc-event-active {
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.5);
          transform: scale(1.02);
        }
        .fc .fc-col-header-cell {
          background: #f8fafc;
          font-weight: 600;
          color: #64748b;
          font-size: 11px;
          padding: 8px 4px;
        }
        .fc .fc-daygrid-day {
          cursor: default;
        }
        .fc .fc-daygrid-day-number {
          padding: 6px;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

