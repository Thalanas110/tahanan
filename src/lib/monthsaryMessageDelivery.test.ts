import assert from 'node:assert/strict';
import test from 'node:test';

import { findDueMonthsaryMessage } from './monthsaryMessageDelivery.ts';

test('findDueMonthsaryMessage ignores future rows and picks an overdue unread row', () => {
  const match = findDueMonthsaryMessage(
    [
      {
        id: 'future',
        recipient_id: 'user-2',
        target_monthsary_date: '2026-08-16',
        completed_at: null,
        created_at: '2026-07-16T02:00:00.000Z',
      },
      {
        id: 'overdue',
        recipient_id: 'user-2',
        target_monthsary_date: '2026-07-16',
        completed_at: null,
        created_at: '2026-07-16T01:00:00.000Z',
      },
    ],
    'user-2',
    new Date(2026, 7, 20, 12, 0, 0),
  );

  assert.equal(match?.id, 'overdue');
});

test('findDueMonthsaryMessage picks the oldest due unread row if legacy data has more than one', () => {
  const match = findDueMonthsaryMessage(
    [
      {
        id: 'older',
        recipient_id: 'user-2',
        target_monthsary_date: '2026-06-16',
        completed_at: null,
        created_at: '2026-06-16T01:00:00.000Z',
      },
      {
        id: 'newer',
        recipient_id: 'user-2',
        target_monthsary_date: '2026-07-16',
        completed_at: null,
        created_at: '2026-07-16T01:00:00.000Z',
      },
    ],
    'user-2',
    new Date(2026, 7, 20, 12, 0, 0),
  );

  assert.equal(match?.id, 'older');
});
