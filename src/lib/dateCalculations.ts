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
export function toIsoDateString(value?: string | Date | null): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return value.toISOString().split('T')[0];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmyMatch) {
    const day = Number.parseInt(dmyMatch[1], 10);
    const month = Number.parseInt(dmyMatch[2], 10);
    const year = Number.parseInt(dmyMatch[3], 10);

    if (
      Number.isFinite(day) &&
      Number.isFinite(month) &&
      Number.isFinite(year) &&
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12
    ) {
      return `${year.toString().padStart(4, '0')}-${month
        .toString()
        .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
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
export function formatDateForDisplay(value?: string | Date | null, locale?: string): string | null {
  const iso = toIsoDateString(value);
  if (!iso) {
    return null;
  }

  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) {
    return null;
  }

  const formatted = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(formatted.getTime())) {
    return null;
  }

  return formatted.toLocaleDateString(locale ?? undefined);
}
