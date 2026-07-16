import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getNextUpcomingMonthsaryDate,
  isMonthsaryDate,
  toLocalDateKey,
} from './monthsaryDates.ts';

test('toLocalDateKey formats a Date in local calendar terms', () => {
  assert.equal(toLocalDateKey(new Date(2026, 6, 16, 12, 0, 0)), '2026-07-16');
});

test('getNextUpcomingMonthsaryDate keeps the current day when today is monthsary', () => {
  assert.equal(
    getNextUpcomingMonthsaryDate('2026-01-16', new Date(2026, 6, 16, 9, 30, 0)),
    '2026-07-16',
  );
});

test('getNextUpcomingMonthsaryDate moves to the next month after the day passes', () => {
  assert.equal(
    getNextUpcomingMonthsaryDate('2026-01-16', new Date(2026, 6, 17, 9, 30, 0)),
    '2026-08-16',
  );
});

test('getNextUpcomingMonthsaryDate falls back to the last day of a shorter month', () => {
  assert.equal(
    getNextUpcomingMonthsaryDate('2026-01-31', new Date(2026, 1, 10, 12, 0, 0)),
    '2026-02-28',
  );
});

test('isMonthsaryDate uses local calendar day matching', () => {
  assert.equal(isMonthsaryDate('2026-01-31', new Date(2026, 3, 30, 8, 0, 0)), true);
  assert.equal(isMonthsaryDate('2026-01-31', new Date(2026, 3, 29, 8, 0, 0)), false);
});
