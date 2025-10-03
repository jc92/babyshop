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

/**
 * Normalize arbitrary date strings to an ISO (YYYY-MM-DD) value suitable for HTML date inputs.
 */
export function toIsoDateString(value?: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString().split('T')[0];
}

/**
 * Format a stored ISO date string for display without introducing timezone drift.
 */
export function formatDateForDisplay(value?: string | null, locale?: string): string | null {
  const iso = toIsoDateString(value);
  if (!iso) {
    return null;
  }

  const [year, month, day] = iso.split('-').map((part) => Number.parseInt(part, 10));
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(locale ?? undefined);
}
