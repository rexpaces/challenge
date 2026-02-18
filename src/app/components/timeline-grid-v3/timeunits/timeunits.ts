export const TIME_SCALES = {
  MONTH: 'Month',
  WEEK: 'Week',
  DAY: 'Day',
};

export const BUFFER_MONTHS = 24;
const BUFFER_WEEKS = 26;
const BUFFER_DAYS = 30;

export const DEFAULT_DATE_RANGE = {
  start: new Date(2020, 0, 1),
  end: new Date(2030, 0, 1),
};

export interface TimeUnit {
  id: number;
  label: string;
  start: Date;
  end: Date;
  type: 'day' | 'week' | 'month';
}

export interface DateRange {
  start: Date;
  end: Date;
}

export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function monthTimeUnits(range: DateRange) {
  const units: TimeUnit[] = [];
  let current = new Date(range.start);
  current.setDate(1);
  current.setHours(0, 0, 0, 0);

  while (current <= range.end) {
    const monthStart = new Date(current);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);

    units.push({
      id: monthStart.getTime(),
      label: `${MONTH_NAMES[current.getMonth()]} ${current.getFullYear()}`,
      start: monthStart,
      end: monthEnd,
      type: 'month',
    });
    current.setMonth(current.getMonth() + 1);
  }

  return units;
}

export function weekTimeUnits(range: DateRange) {
  const units: TimeUnit[] = [];
  let current = new Date(range.start);
  // Start from the beginning of the week (Sunday)
  const day = current.getDay();
  current.setDate(current.getDate() - day);
  current.setHours(0, 0, 0, 0);

  while (current <= range.end) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const startStr = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    const endStr = `${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

    units.push({
      id: weekStart.getTime(),
      label: `${startStr}-${endStr}`,
      start: weekStart,
      end: weekEnd,
      type: 'week',
    });
    current.setDate(current.getDate() + 7);
  }
  return units;
}

export function dayTimeUnits(range: DateRange) {
  const units: TimeUnit[] = [];
  let current = new Date(range.start);
  current.setHours(0, 0, 0, 0);

  while (current <= range.end) {
    const dayStart = new Date(current);
    const dayEnd = new Date(current);
    dayEnd.setHours(23, 59, 59, 999);

    units.push({
      id: dayStart.getTime(),
      label: `${MONTH_NAMES[current.getMonth()]} ${current.getDate()}`,
      start: dayStart,
      end: dayEnd,
      type: 'day',
    });
    current.setDate(current.getDate() + 1);
  }
  return units;
}

export function getTimeUnits(
  scale: string = TIME_SCALES.MONTH,
  range: DateRange = DEFAULT_DATE_RANGE,
): TimeUnit[] {
  switch (scale) {
    case TIME_SCALES.MONTH:
      return monthTimeUnits(range);
    case TIME_SCALES.WEEK:
      return weekTimeUnits(range);
    case TIME_SCALES.DAY:
      return dayTimeUnits(range);
    default:
      return monthTimeUnits(range);
  }
}

export function getMonthDateRange(centerDate?: Date): DateRange {
  const anchor = centerDate ?? new Date();
  const start = new Date(anchor);
  const end = new Date(anchor);

  start.setMonth(start.getMonth() - BUFFER_MONTHS);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  end.setMonth(end.getMonth() + BUFFER_MONTHS);
  end.setDate(0);
  end.setHours(23, 59, 59, 999);
  return {
    start,
    end,
  };
}

export function getWeekDateRange(centerDate?: Date): DateRange {
  const anchor = centerDate ?? new Date();
  const start = new Date(anchor);
  const end = new Date(anchor);

  // 1. Apply Buffer (13 weeks back, 13 weeks forward)
  start.setDate(start.getDate() - (BUFFER_WEEKS * 7));
  end.setDate(end.getDate() + (BUFFER_WEEKS * 7));

  // 2. Snap Start to Sunday 00:00:00
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);

  // 3. Snap End to Saturday 23:59:59
  end.setDate(end.getDate() + (6 - end.getDay()));
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getDayDateRange(centerDate?: Date): DateRange {
  const anchor = centerDate ?? new Date();
  const start = new Date(anchor);
  const end = new Date(anchor);

  // 1. Apply Buffer (30 days back, 30 days forward)
  start.setDate(start.getDate() - BUFFER_DAYS);
  end.setDate(end.getDate() + BUFFER_DAYS);

  // 2. Normalize Start to 00:00:00
  start.setHours(0, 0, 0, 0);

  // 3. Normalize End to 23:59:59
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getTimeScaleDateRange(
  scale: string = TIME_SCALES.MONTH,
  anchorDate: Date
): DateRange {
  switch (scale) {
    case TIME_SCALES.MONTH:
      return getMonthDateRange(anchorDate);
    case TIME_SCALES.WEEK:
      return getWeekDateRange(anchorDate);
    case TIME_SCALES.DAY:
      return getDayDateRange(anchorDate);
    default:
      return getMonthDateRange(anchorDate);
  }
}
