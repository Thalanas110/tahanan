import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMonthsaryMessageInput,
  findEditableMonthsaryMessage,
  findPendingMonthsaryMessage,
  getMonthsaryComposerTarget,
} from './monthsaryMessageDraft.ts';

test('getMonthsaryComposerTarget returns the next monthsary only for partner rooms', () => {
  assert.equal(
    getMonthsaryComposerTarget({
      roomType: 'partner',
      relationshipStartDate: '2026-07-16',
      now: new Date(2026, 7, 1, 12, 0, 0),
    }),
    '2026-08-16',
  );

  assert.equal(
    getMonthsaryComposerTarget({
      roomType: 'cof',
      relationshipStartDate: '2026-07-16',
      now: new Date(2026, 7, 1, 12, 0, 0),
    }),
    null,
  );
});

test('findPendingMonthsaryMessage picks the unread message for the matching recipient and date', () => {
  const match = findPendingMonthsaryMessage(
    [
      {
        id: 'done',
        recipient_id: 'user-2',
        target_monthsary_date: '2026-08-16',
        completed_at: '2026-08-16T01:00:00.000Z',
      },
      {
        id: 'pending',
        recipient_id: 'user-2',
        target_monthsary_date: '2026-08-16',
        completed_at: null,
      },
    ],
    'user-2',
    '2026-08-16',
  );

  assert.equal(match?.id, 'pending');
});

test('findEditableMonthsaryMessage returns the creator draft even before a partner joins', () => {
  const match = findEditableMonthsaryMessage(
    [
      {
        id: 'mine',
        created_by: 'user-1',
        recipient_id: null,
        target_monthsary_date: '2026-08-16',
        completed_at: null,
      },
      {
        id: 'other',
        created_by: 'user-2',
        recipient_id: 'user-1',
        target_monthsary_date: '2026-08-16',
        completed_at: null,
      },
    ],
    'user-1',
  );

  assert.equal(match?.id, 'mine');
});

test('buildMonthsaryMessageInput maps the composer payload to table columns', () => {
  assert.deepEqual(
    buildMonthsaryMessageInput({
      coupleId: 'couple-1',
      recipientId: null,
      title: '  Happy monthsary  ',
      body: '  Still here.  ',
      targetMonthsaryDate: '2026-08-16',
    }),
    {
      couple_id: 'couple-1',
      recipient_id: null,
      title: 'Happy monthsary',
      body: 'Still here.',
      target_monthsary_date: '2026-08-16',
    },
  );
});
