import { isSameDay } from 'date-fns';
import type {
  CalendarEvent,
  DailyCheckin,
  EmergencyEvent,
} from '../types/database.ts';

export function pickLatestCheckins(
  checkins: DailyCheckin[],
  userId: string | null | undefined,
): {
  myLatestCheckin: DailyCheckin | null;
  partnerLatestCheckin: DailyCheckin | null;
} {
  const sorted = [...checkins].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );

  return {
    myLatestCheckin: sorted.find((checkin) => checkin.user_id === userId) ?? null,
    partnerLatestCheckin: sorted.find((checkin) => checkin.user_id !== userId) ?? null,
  };
}

export function pickTodaysEvents(
  events: CalendarEvent[],
  now = new Date(),
): CalendarEvent[] {
  return events.filter((event) => isSameDay(new Date(event.start_time), now));
}

export function pickActiveEmergency(
  events: EmergencyEvent[],
): EmergencyEvent | null {
  return (
    [...events]
      .filter((event) => event.status !== 'resolved')
      .sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      )[0] ?? null
  );
}
