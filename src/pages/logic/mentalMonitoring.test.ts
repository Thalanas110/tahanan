import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canBeginDassAssessment,
  entriesVisibleInPartnerSpace,
} from './mentalMonitoring.ts';

test('DASS assessment is available only in a partner space once the server eligibility date has passed', () => {
  const now = new Date('2026-07-21T12:00:00.000Z');

  assert.equal(
    canBeginDassAssessment({
      activeRoomType: 'partner',
      coupleId: 'couple-1',
      nextEligibleAt: '2026-07-21T11:59:59.000Z',
      now,
    }),
    true,
  );
  assert.equal(
    canBeginDassAssessment({
      activeRoomType: 'partner',
      coupleId: 'couple-1',
      nextEligibleAt: '2026-07-21T12:00:01.000Z',
      now,
    }),
    false,
  );
  assert.equal(
    canBeginDassAssessment({
      activeRoomType: 'cof',
      coupleId: 'cof-1',
      nextEligibleAt: null,
      now,
    }),
    false,
  );
});

test('DASS history shows entries belonging to the current person and their partner only', () => {
  const entries = [
    { id: 'mine', submittedBy: 'me' },
    { id: 'partner', submittedBy: 'partner' },
    { id: 'other', submittedBy: 'other' },
  ];

  assert.deepEqual(
    entriesVisibleInPartnerSpace(entries, ['me', 'partner']),
    [
      { id: 'mine', submittedBy: 'me' },
      { id: 'partner', submittedBy: 'partner' },
    ],
  );
});
