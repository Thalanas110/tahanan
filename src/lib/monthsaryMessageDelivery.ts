import { toLocalDateKey } from './monthsaryDates.ts';

export function findDueMonthsaryMessage<
  T extends {
    recipient_id: string | null;
    target_monthsary_date: string;
    completed_at: string | null;
    created_at: string;
  },
>(messages: T[], recipientId: string | null | undefined, now = new Date()): T | null {
  if (!recipientId) {
    return null;
  }

  const todayKey = toLocalDateKey(now);

  return (
    [...messages]
      .filter(
        (message) =>
          message.recipient_id === recipientId &&
          message.completed_at === null &&
          message.target_monthsary_date <= todayKey,
      )
      .sort(
        (left, right) =>
          left.target_monthsary_date.localeCompare(right.target_monthsary_date) ||
          left.created_at.localeCompare(right.created_at),
      )[0] ?? null
  );
}
