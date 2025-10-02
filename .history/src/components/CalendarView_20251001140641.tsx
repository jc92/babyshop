"use client";

import { useMemo, useEffect, useRef } from "react";
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
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

  // Auto-scroll to keep top timeline row visible
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollToTop = () => {
        container.scrollTop = 0;
      };
      
      // Scroll to top on mount and when milestones change
      scrollToTop();
      
      // Also scroll to top when active milestone changes
      const timeoutId = setTimeout(scrollToTop, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [milestones, activeMilestoneId]);

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
    <div className="parent-card rounded-3xl shadow-xl overflow-hidden">
      {/* Header with current date indicator */}
      <div className="bg-gradient-to-r from-amber-50 to-pink-50 px-6 py-4 border-b border-amber-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-amber-900">Timeline Overview</h2>
            <p className="text-sm text-amber-700 mt-1">
              Your baby's journey from {months[0]?.name} {months[0]?.year} to {months[months.length - 1]?.name} {months[months.length - 1]?.year}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <span>Current month</span>
          </div>
        </div>
      </div>
      
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto scroll-smooth" 
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="relative min-w-max">
          {/* Month Headers with improved styling */}
          <div className="flex sticky top-0 bg-white z-20 border-b-2 border-slate-200 shadow-lg">
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
          
          {/* Timeline Events with improved styling */}
          <div className="relative bg-slate-50/30 min-h-[200px] pt-4">
            {/* Timeline track background */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-indigo-50/30"></div>
            
            {/* Top timeline row indicator */}
            <div className="absolute top-4 left-0 right-0 h-1 bg-indigo-500/20 z-5"></div>
            
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
              const top = 20 + (index * 60); // Stack milestones vertically with proper spacing from header
              
              // Check if milestone is active, past, or future
              const now = new Date();
              const isActive = milestone.id === activeMilestoneId;
              const isPast = end < now;
              const isCurrent = start <= now && end >= now;
              
              return (
                <div
                  key={milestone.id}
                  onClick={() => onSelectMilestone(milestone.id as MilestoneId)}
                  className={`absolute h-14 rounded-xl cursor-pointer transition-all duration-200 flex items-center px-4 group ${
                    isActive
                      ? 'bg-indigo-100 border-2 border-indigo-400 text-indigo-900 shadow-lg transform scale-105'
                      : isPast
                        ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        : isCurrent
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-md'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md'
                  }`}
                  style={{
                    left: `${left}px`,
                    width: `${width}px`,
                    top: `${top}px`,
                    zIndex: isActive ? 15 : 5,
                  }}
                >
                  <div className="flex items-center w-full">
                    <div className="flex-1">
                      <div className="font-semibold text-sm truncate">{milestone.label}</div>
                      <div className="text-xs opacity-75 mt-0.5">
                        {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    {isActive && (
                      <div className="ml-2 w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Enhanced Month Grid Lines */}
            <div className="flex">
              {months.map((month, index) => {
                const isCurrentMonth = month.date.getMonth() === new Date().getMonth() && 
                                     month.date.getFullYear() === new Date().getFullYear();
                return (
                  <div
                    key={`grid-${month.year}-${month.month}`}
                    className={`flex-shrink-0 w-80 h-40 border-r ${
                      isCurrentMonth ? 'border-indigo-300 bg-indigo-50/20' : 'border-slate-200'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .overflow-x-auto::-webkit-scrollbar {
          height: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 6px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #cbd5e1, #94a3b8);
          border-radius: 6px;
          border: 2px solid #f1f5f9;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(90deg, #94a3b8, #64748b);
        }
        
        /* Smooth scrolling enhancement */
        .scroll-smooth {
          scroll-behavior: smooth;
        }
        
        /* Timeline animation */
        @keyframes timelineGlow {
          0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.6); }
        }
        
        .timeline-active {
          animation: timelineGlow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

