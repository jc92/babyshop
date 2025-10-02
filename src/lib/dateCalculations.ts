/**
 * Calculate actual dates for milestones based on birth date or due date
 */
export function calculateMilestoneDates(
  birthOrDueDate: string
): Date {
  if (!birthOrDueDate) {
    // Default to current date if no date provided
    return new Date();
  }
  
  const referenceDate = new Date(birthOrDueDate);
  
  // If baby is not yet born, use due date as reference
  // If baby is born, use birth date as reference
  return referenceDate;
}

/**
 * Convert milestone month range to actual date range
 * Month 0 = birth/due date
 * Negative months = before birth (prenatal)
 */
export function getDateRangeForMilestone(
  monthRange: [number, number],
  referenceDate: Date
): { start: Date; end: Date } {
  const start = new Date(referenceDate);
  start.setMonth(start.getMonth() + monthRange[0]);
  
  const end = new Date(referenceDate);
  end.setMonth(end.getMonth() + monthRange[1]);
  
  return { start, end };
}

/**
 * Get the current month index relative to reference date
 * Returns negative if before birth, positive if after
 */
export function getCurrentMonthIndex(referenceDate: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - referenceDate.getTime();
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44)); // Average month length
  return diffMonths;
}

/**
 * Format date for FullCalendar (YYYY-MM-DD)
 */
export function formatDateForCalendar(date: Date): string {
  return date.toISOString().split('T')[0];
}

