"use client";

import { useMemo } from "react";
import type { Milestone, MilestoneId } from "@/data/catalog";
import { getDateRangeForMilestone, formatDateForCalendar } from "@/lib/dateCalculations";

type CalendarViewProps = {
  milestones: Milestone[];
  activeMilestoneId: MilestoneId;
  onSelectMilestone: (id: MilestoneId) => void;
  referenceDate: Date;
};

type MonthEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  milestone: Milestone;
};

export default function CalendarView({ milestones, activeMilestoneId, onSelectMilestone, referenceDate }: CalendarViewProps) {
  // Generate 12 months starting from 2 months ago
  const months = useMemo(() => {
    const now = new Date();
    const startMonth = now.getMonth() - 2;
    const startYear = now.getFullYear();
    
    return Array.from({ length: 14 }, (_, i) => {
      const monthDate = new Date(startYear, startMonth + i, 1);
      return {
        date: monthDate,
        name: monthDate.toLocaleString('default', { month: 'long' }),
        year: monthDate.getFullYear(),
        month: monthDate.getMonth(),
      };
    });
  }, []);

  // Get events for each month
  const monthEvents = useMemo(() => {
    const eventsByMonth: { [key: string]: MonthEvent[] } = {};
    
    milestones.forEach((milestone) => {
      const { start, end } = getDateRangeForMilestone(milestone.monthRange, referenceDate);
      
      // Check which months this milestone spans
      months.forEach((month) => {
        const monthStart = new Date(month.year, month.month, 1);
        const monthEnd = new Date(month.year, month.month + 1, 0);
        
        // Check if milestone overlaps with this month
        if (start <= monthEnd && end >= monthStart) {
          const key = `${month.year}-${month.month}`;
          if (!eventsByMonth[key]) {
            eventsByMonth[key] = [];
          }
          
          eventsByMonth[key].push({
            id: milestone.id,
            title: milestone.label,
            start,
            end,
            milestone,
          });
        }
      });
    });
    
    return eventsByMonth;
  }, [milestones, referenceDate, months]);

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-xl">
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Calendar view</h2>
      <div className="overflow-x-auto scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate={formatDateForCalendar(new Date())}
          height={650}
          firstDay={0}
          events={events}
          headerToolbar={{
            start: "",
            center: "",
            end: "",
          }}
          views={{
            dayGridMonth: {
              titleFormat: { month: 'long', year: 'numeric' }
            }
          }}
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

