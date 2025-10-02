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
        <div className="flex gap-4 pb-4">
          {months.map((month) => {
            const monthKey = `${month.year}-${month.month}`;
            const events = monthEvents[monthKey] || [];
            const isCurrentMonth = month.date.getMonth() === new Date().getMonth() && 
                                 month.date.getFullYear() === new Date().getFullYear();
            
            return (
              <div
                key={monthKey}
                className={`flex-shrink-0 w-80 rounded-2xl border overflow-hidden ${
                  isCurrentMonth 
                    ? 'border-indigo-300 bg-indigo-50/30' 
                    : 'border-slate-200 bg-white'
                }`}
                style={{ scrollMarginTop: '1rem' }}
              >
                {/* Month Header */}
                <div className={`px-4 py-3 text-center font-semibold ${
                  isCurrentMonth ? 'bg-indigo-100 text-indigo-900' : 'bg-slate-50 text-slate-700'
                }`}>
                  {month.name} {month.year}
                </div>
                
                {/* Events List */}
                <div className="p-4">
                  {events.length > 0 ? (
                    <div className="space-y-2">
                      {events.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => onSelectMilestone(event.id as MilestoneId)}
                          className={`p-3 rounded-lg cursor-pointer transition-all ${
                            event.id === activeMilestoneId
                              ? 'bg-indigo-100 border-2 border-indigo-300 text-indigo-900'
                              : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600'
                          }`}
                        >
                          <div className="font-medium text-sm">{event.title}</div>
                          <div className="text-xs opacity-75 mt-1">
                            {event.start.toLocaleDateString()} - {event.end.toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 text-sm py-8">
                      No milestones this month
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
      `}</style>
    </div>
  );
}

