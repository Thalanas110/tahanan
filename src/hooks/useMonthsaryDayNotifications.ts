import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { toast } from 'sonner';
import {
  buildMonthsaryDayReminderIds,
  buildMonthsaryDayReminderSchedule,
  shouldShowMonthsaryDayReminder,
} from '@/lib/monthsaryDayReminder';
import { toLocalDateKey } from '@/lib/monthsaryDates';
import type { Couple, RoomMemberSummary } from '@/types/database';

const MONTHSARY_NOTIFICATION_CHANNEL = {
  id: 'monthsary_day',
  name: 'Monthsary Day',
  description: 'Monthsary reminders for your partner space.',
  importance: 4 as const,
  visibility: 1 as const,
  vibration: true,
};

const REMINDER_COUNT = 12;
const REMINDER_HOUR = 9;
const REMINDER_MINUTE = 0;

function getReminderStorageKey(userId: string, coupleId: string) {
  return `tahanan:monthsary-day-seen:${userId}:${coupleId}`;
}

export function useMonthsaryDayNotifications(input: {
  userId: string | null | undefined;
  couple: Pick<Couple, 'id' | 'relationship_start_date'> | null | undefined;
  members?: RoomMemberSummary[] | null;
}) {
  const previousCoupleIdRef = useRef<string | null>(null);
  const partnerName =
    input.members?.find((member) => member.user_id !== input.userId)?.profiles?.display_name ?? null;

  useEffect(() => {
    if (
      !input.userId ||
      !input.couple?.id ||
      !input.couple.relationship_start_date ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const now = new Date();
    const storageKey = getReminderStorageKey(input.userId, input.couple.id);
    const seenDateKey = window.localStorage.getItem(storageKey);

    if (
      !shouldShowMonthsaryDayReminder({
        relationshipStartDate: input.couple.relationship_start_date,
        seenDateKey,
        now,
      })
    ) {
      return;
    }

    const [previewReminder] = buildMonthsaryDayReminderSchedule({
      coupleId: input.couple.id,
      relationshipStartDate: input.couple.relationship_start_date,
      partnerName,
      now: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
      count: 1,
      hour: REMINDER_HOUR,
      minute: REMINDER_MINUTE,
    });

    window.localStorage.setItem(storageKey, toLocalDateKey(now));
    toast('Happy monthsary', {
      description: previewReminder?.body ?? "It's monthsary day for you and your partner.",
      duration: 12_000,
    });
  }, [input.userId, input.couple?.id, input.couple?.relationship_start_date, partnerName]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let cancelled = false;

    const cancelNotifications = async (coupleId: string) => {
      const ids = buildMonthsaryDayReminderIds(coupleId, REMINDER_COUNT).map((id) => ({ id }));
      await LocalNotifications.cancel({ notifications: ids });
    };

    const syncNotifications = async () => {
      const previousCoupleId = previousCoupleIdRef.current;

      if (previousCoupleId && previousCoupleId !== input.couple?.id) {
        await cancelNotifications(previousCoupleId);
      }

      if (!input.couple?.id || !input.couple.relationship_start_date) {
        previousCoupleIdRef.current = input.couple?.id ?? null;
        return;
      }

      let permission = await LocalNotifications.checkPermissions();
      if (permission.display === 'prompt') {
        permission = await LocalNotifications.requestPermissions();
      }

      if (permission.display !== 'granted') {
        previousCoupleIdRef.current = input.couple.id;
        return;
      }

      if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel(MONTHSARY_NOTIFICATION_CHANNEL);
      }

      const reminders = buildMonthsaryDayReminderSchedule({
        coupleId: input.couple.id,
        relationshipStartDate: input.couple.relationship_start_date,
        partnerName,
        count: REMINDER_COUNT,
        hour: REMINDER_HOUR,
        minute: REMINDER_MINUTE,
      });
      const coupleId = input.couple.id;

      await cancelNotifications(coupleId);

      if (cancelled || reminders.length === 0) {
        previousCoupleIdRef.current = coupleId;
        return;
      }

      await LocalNotifications.schedule({
        notifications: reminders.map((reminder) => ({
          id: reminder.id,
          title: reminder.title,
          body: reminder.body,
          channelId: MONTHSARY_NOTIFICATION_CHANNEL.id,
          autoCancel: true,
          schedule: {
            at: reminder.fireAt,
            allowWhileIdle: true,
          },
          extra: {
            type: 'monthsary-day',
            coupleId,
          },
        })),
      });

      if (!cancelled) {
        previousCoupleIdRef.current = coupleId;
      }
    };

    syncNotifications().catch((error) => {
      console.error('Failed to sync monthsary day notifications:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [input.couple?.id, input.couple?.relationship_start_date, partnerName]);
}
