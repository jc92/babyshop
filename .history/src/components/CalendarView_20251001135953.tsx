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
    <div className="rounded-3xl border border-slate-200/70 bg-white shadow-xl overflow-hidden">
      {/* Header with current date indicator */}
      <div className="bg-gradient-to-r from-slate-50 to-indigo-50 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Timeline Overview</h2>
            <p className="text-sm text-slate-600 mt-1">
              Your baby's journey from {months[0]?.name} {months[0]?.year} to {months[months.length - 1]?.name} {months[months.length - 1]?.year}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
            <span>Current month</span>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
        <div className="relative min-w-max">
          {/* Month Headers with improved styling */}
          <div className="flex sticky top-0 bg-white z-10 border-b-2 border-slate-200 shadow-sm">
            {months.map((month, index) => {
              const isCurrentMonth = month.date.getMonth() === new Date().getMonth() && 
                                   month.date.getFullYear() === new Date().getFullYear();
              const isPast = month.date < new Date();
              const isFuture = month.date > new Date();
              
              return (
                <div
                  key={`${month.year}-${month.month}`}
                  className={`flex-shrink-0 w-80 px-4 py-4 text-center font-semibold border-r border-slate-200 transition-colors ${
                    isCurrentMonth 
                      ? 'bg-indigo-100 text-indigo-900 border-indigo-300' 
                      : isPast 
                        ? 'bg-slate-50 text-slate-600' 
                        : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <div className="text-lg font-bold">{month.name}</div>
                    <div className="text-sm opacity-75">{month.year}</div>
                    {isCurrentMonth && (
                      <div className="mt-1 w-2 h-2 bg-indigo-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Timeline Events */}
          <div className="relative">
            {milestones.map((milestone, index) => {
              const { start, end } = getDateRangeForMilestone(milestone.monthRange, referenceDate);
              const startMonth = start.getMonth();
              const startYear = start.getFullYear();
              const endMonth = end.getMonth();
              const endYear = end.getFullYear();
              
              // Calculate position and width
              const startMonthIndex = months.findIndex(m => 
                m.month === startMonth && m.year === startYear
              );
              const endMonthIndex = months.findIndex(m => 
                m.month === endMonth && m.year === endYear
              );
              
              if (startMonthIndex === -1 || endMonthIndex === -1) return null;
              
              const left = startMonthIndex * 320; // 320px per month
              const width = (endMonthIndex - startMonthIndex + 1) * 320;
              
              return (
                <div
                  key={milestone.id}
                  onClick={() => onSelectMilestone(milestone.id as MilestoneId)}
                  className={`absolute top-4 h-12 rounded-lg cursor-pointer transition-all flex items-center px-4 ${
                    milestone.id === activeMilestoneId
                      ? 'bg-indigo-100 border-2 border-indigo-300 text-indigo-900 shadow-lg'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md'
                  }`}
                  style={{
                    left: `${left}px`,
                    width: `${width}px`,
                    zIndex: milestone.id === activeMilestoneId ? 20 : 10,
                  }}
                >
                  <div className="font-medium text-sm truncate">{milestone.label}</div>
                </div>
              );
            })}
            
            {/* Month Grid Lines */}
            <div className="flex">
              {months.map((month, index) => (
                <div
                  key={`grid-${month.year}-${month.month}`}
                  className="flex-shrink-0 w-80 h-32 border-r border-slate-200"
                />
              ))}
            </div>
          </div>
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

