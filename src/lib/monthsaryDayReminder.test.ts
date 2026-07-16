import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMonthsaryDayReminderIds,
  buildMonthsaryDayReminderSchedule,
  shouldShowMonthsaryDayReminder,
} from './monthsaryDayReminder.ts';

test('shouldShowMonthsaryDayReminder only opens on an unseen monthsary day', () => {
  assert.equal(
    shouldShowMonthsaryDayReminder({
      relationshipStartDate: '2026-01-16',
      seenDateKey: null,
      now: new Date(2026, 6, 16, 8, 0, 0),
    }),
    true,
  );

  assert.equal(
    shouldShowMonthsaryDayReminder({
      relationshipStartDate: '2026-01-16',
      seenDateKey: '2026-07-16',
      now: new Date(2026, 6, 16, 8, 0, 0),
    }),
    false,
  );

  assert.equal(
    shouldShowMonthsaryDayReminder({
      relationshipStartDate: '2026-01-16',
      seenDateKey: null,
      now: new Date(2026, 6, 15, 8, 0, 0),
    }),
    false,
  );
});

test('buildMonthsaryDayReminderSchedule includes today when the reminder time has not passed yet', () => {
  const reminders = buildMonthsaryDayReminderSchedule({
    coupleId: 'couple-1',
    relationshipStartDate: '2026-01-16',
    partnerName: 'Kai',
    now: new Date(2026, 6, 16, 8, 30, 0),
    count: 3,
    hour: 9,
    minute: 0,
  });

  assert.deepEqual(
    reminders.map((reminder) => reminder.fireAt.toISOString()),
    [
      new Date(2026, 6, 16, 9, 0, 0, 0).toISOString(),
      new Date(2026, 7, 16, 9, 0, 0, 0).toISOString(),
      new Date(2026, 8, 16, 9, 0, 0, 0).toISOString(),
    ],
  );
  assert.equal(reminders[0]?.title, 'Happy monthsary');
  assert.equal(reminders[0]?.body, "It's monthsary day for you and Kai.");
});

test('buildMonthsaryDayReminderSchedule skips today when the reminder time already passed', () => {
  const reminders = buildMonthsaryDayReminderSchedule({
    coupleId: 'couple-1',
    relationshipStartDate: '2026-01-16',
    now: new Date(2026, 6, 16, 9, 1, 0),
    count: 2,
    hour: 9,
    minute: 0,
  });

  assert.deepEqual(
    reminders.map((reminder) => reminder.fireAt.toISOString()),
    [
      new Date(2026, 7, 16, 9, 0, 0, 0).toISOString(),
      new Date(2026, 8, 16, 9, 0, 0, 0).toISOString(),
    ],
  );
});

test('buildMonthsaryDayReminderSchedule falls back to the last day of shorter months', () => {
  const reminders = buildMonthsaryDayReminderSchedule({
    coupleId: 'couple-1',
    relationshipStartDate: '2026-01-31',
    now: new Date(2026, 1, 10, 12, 0, 0),
    count: 3,
    hour: 9,
    minute: 0,
  });

  assert.deepEqual(
    reminders.map((reminder) => reminder.fireAt.toISOString()),
    [
      new Date(2026, 1, 28, 9, 0, 0, 0).toISOString(),
      new Date(2026, 2, 31, 9, 0, 0, 0).toISOString(),
      new Date(2026, 3, 30, 9, 0, 0, 0).toISOString(),
    ],
  );
});

test('buildMonthsaryDayReminderIds stays stable for a couple and count', () => {
  const first = buildMonthsaryDayReminderIds('couple-1', 3);
  const second = buildMonthsaryDayReminderIds('couple-1', 3);

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.map((value, index) => value - index),
    [first[0], first[0], first[0]],
  );
});
