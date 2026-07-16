import { isMonthsaryDate, toLocalDateKey } from './monthsaryDates.ts';

const DEFAULT_TITLE = 'Happy monthsary';
const DEFAULT_BODY = "It's monthsary day for you and your partner.";

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month, day };
}

function getLastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function buildReminderDate(
  relationshipStartDate: string,
  year: number,
  monthIndex: number,
  hour: number,
  minute: number,
): Date {
  const { day } = parseDateKey(relationshipStartDate);
  const actualDay = Math.min(day, getLastDayOfMonth(year, monthIndex));
  return new Date(year, monthIndex, actualDay, hour, minute, 0, 0);
}

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function getReminderBaseId(coupleId: string): number {
  return 300_000 + (hashString(coupleId) % 100_000);
}

function buildReminderBody(partnerName: string | null | undefined): string {
  if (partnerName?.trim()) {
    return `It's monthsary day for you and ${partnerName.trim()}.`;
  }

  return DEFAULT_BODY;
}

export interface MonthsaryDayReminder {
  id: number;
  title: string;
  body: string;
  fireAt: Date;
}

export function shouldShowMonthsaryDayReminder(input: {
  relationshipStartDate: string | null;
  seenDateKey: string | null;
  now?: Date;
}): boolean {
  if (!input.relationshipStartDate) {
    return false;
  }

  const now = input.now ?? new Date();
  const todayKey = toLocalDateKey(now);

  return isMonthsaryDate(input.relationshipStartDate, now) && input.seenDateKey !== todayKey;
}

export function buildMonthsaryDayReminderSchedule(input: {
  coupleId: string;
  relationshipStartDate: string;
  partnerName?: string | null;
  now?: Date;
  count?: number;
  hour?: number;
  minute?: number;
}): MonthsaryDayReminder[] {
  const now = input.now ?? new Date();
  const count = input.count ?? 12;
  const hour = input.hour ?? 9;
  const minute = input.minute ?? 0;
  const reminderIds = buildMonthsaryDayReminderIds(input.coupleId, count);
  const reminders: MonthsaryDayReminder[] = [];

  let year = now.getFullYear();
  let monthIndex = now.getMonth();

  while (reminders.length < count) {
    const reminderDate = buildReminderDate(
      input.relationshipStartDate,
      year,
      monthIndex,
      hour,
      minute,
    );

    if (reminderDate.getTime() > now.getTime()) {
      reminders.push({
        id: reminderIds[reminders.length],
        title: DEFAULT_TITLE,
        body: buildReminderBody(input.partnerName),
        fireAt: reminderDate,
      });
    }

    monthIndex += 1;
    if (monthIndex > 11) {
      monthIndex = 0;
      year += 1;
    }
  }

  return reminders;
}

export function buildMonthsaryDayReminderIds(coupleId: string, count = 12): number[] {
  const baseId = getReminderBaseId(coupleId);
  return Array.from({ length: count }, (_value, index) => baseId + index);
}
