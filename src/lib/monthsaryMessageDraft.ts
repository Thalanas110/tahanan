import type { CoupleType } from '@/types/database';
import { getNextUpcomingMonthsaryDate } from './monthsaryDates.ts';

export function getMonthsaryComposerTarget(input: {
  roomType: CoupleType;
  relationshipStartDate: string | null;
  now?: Date;
}): string | null {
  if (input.roomType !== 'partner' || !input.relationshipStartDate) {
    return null;
  }

  return getNextUpcomingMonthsaryDate(input.relationshipStartDate, input.now);
}

export function findPendingMonthsaryMessage<
  T extends {
    recipient_id: string | null;
    target_monthsary_date: string;
    completed_at: string | null;
  },
>(messages: T[], recipientId: string | null | undefined, targetDate: string | null): T | null {
  if (!recipientId || !targetDate) {
    return null;
  }

  return (
    messages.find(
      (message) =>
        message.recipient_id === recipientId &&
        message.target_monthsary_date === targetDate &&
        message.completed_at === null,
    ) ?? null
  );
}

export function buildMonthsaryMessageInput(input: {
  coupleId: string;
  recipientId: string;
  title?: string;
  body: string;
  targetMonthsaryDate: string;
}) {
  return {
    couple_id: input.coupleId,
    recipient_id: input.recipientId,
    title: input.title?.trim() ? input.title.trim() : null,
    body: input.body.trim(),
    target_monthsary_date: input.targetMonthsaryDate,
  };
}
