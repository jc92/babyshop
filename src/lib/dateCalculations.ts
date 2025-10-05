/**
 * Calculate actual dates for milestones based on birth date or due date
 */
export function calculateMilestoneDates(
  birthOrDueDate: string
): Date {
  const parsed = toDate(birthOrDueDate);
  if (parsed) {
    return parsed;
  }

  // Default to current date if parsing fails
  return new Date();
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

  const formatter = new Intl.DateTimeFormat(locale ?? 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return formatter.format(formatted);
}

/**
 * Safely create a Date instance from an arbitrary input, normalizing date-only strings to local midnight
 * while preserving full timestamp information when present.
 */
export function toDate(value?: string | Date | null): Date | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    const isUtcMidnight =
      value.getUTCHours() === 0 &&
      value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0 &&
      value.getUTCMilliseconds() === 0;

    if (isUtcMidnight) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    return new Date(value.getTime());
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const hasTimeComponent = /[T\s]\d/.test(trimmed);
    if (!hasTimeComponent) {
      const iso = toIsoDateString(trimmed);
      if (!iso) {
        return null;
      }

      const [year, month, day] = iso.split('-');
      if (!year || !month || !day) {
        return null;
      }

      const parsed = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const iso = toIsoDateString(trimmed);
      if (iso) {
        const timeMatch = trimmed.match(/[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?$/);
        if (timeMatch) {
          const [, hours, minutes, seconds, timezone] = timeMatch;
          const hourValue = Number(hours);
          const minuteValue = Number(minutes ?? "0");
          const secondValue = Number(seconds ?? "0");
          const isMidnight = hourValue === 0 && minuteValue === 0 && secondValue === 0;
          const hasTimezone = Boolean(timezone);

          if (isMidnight && hasTimezone) {
            const [year, month, day] = iso.split('-');
            if (year && month && day) {
              const midnightLocal = new Date(Number(year), Number(month) - 1, Number(day));
              if (!Number.isNaN(midnightLocal.getTime())) {
                return midnightLocal;
              }
            }
          }
        }
      }

      return parsed;
    }

    const fallbackIso = toIsoDateString(trimmed);
    if (!fallbackIso) {
      return null;
    }

    const [fallbackYear, fallbackMonth, fallbackDay] = fallbackIso.split('-');
    if (!fallbackYear || !fallbackMonth || !fallbackDay) {
      return null;
    }

    const fallback = new Date(Number(fallbackYear), Number(fallbackMonth) - 1, Number(fallbackDay));
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  if (value == null) {
    return null;
  }

  return null;
}

/**
 * Format a date-time value for display with dd/mm/yyyy ordering and 24-hour time.
 */
export function formatDateTimeForDisplay(
  value?: string | Date | null,
  locale?: string,
  options?: Intl.DateTimeFormatOptions,
): string | null {
  const parsed = toDate(value);
  if (!parsed) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat(locale ?? 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  });

  return formatter.format(parsed);
}
