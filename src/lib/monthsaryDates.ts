function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month, day };
}

function getLastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function buildMonthsaryDate(
  relationshipStartDate: string,
  year: number,
  monthIndex: number,
): Date {
  const { day } = parseDateKey(relationshipStartDate);
  const actualDay = Math.min(day, getLastDayOfMonth(year, monthIndex));
  return new Date(year, monthIndex, actualDay, 12, 0, 0, 0);
}

export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getNextUpcomingMonthsaryDate(
  relationshipStartDate: string,
  now = new Date(),
): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const currentMonthCandidate = buildMonthsaryDate(
    relationshipStartDate,
    today.getFullYear(),
    today.getMonth(),
  );

  if (currentMonthCandidate.getTime() >= today.getTime()) {
    return toLocalDateKey(currentMonthCandidate);
  }

  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1, 12, 0, 0, 0);
  return toLocalDateKey(
    buildMonthsaryDate(relationshipStartDate, nextMonth.getFullYear(), nextMonth.getMonth()),
  );
}

export function isMonthsaryDate(relationshipStartDate: string, now = new Date()): boolean {
  return getNextUpcomingMonthsaryDate(relationshipStartDate, now) === toLocalDateKey(now);
}
