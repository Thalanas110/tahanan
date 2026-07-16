import assert from 'node:assert/strict';
import test from 'node:test';

import {
  pickActiveEmergency,
  pickLatestCheckins,
  pickTodaysEvents,
} from './roomDashboard.ts';

test('pickLatestCheckins keeps the newest record per participant', () => {
  const { myLatestCheckin, partnerLatestCheckin } = pickLatestCheckins(
    [
      { id: 'a', user_id: 'me', created_at: '2026-07-16T01:00:00.000Z' },
      { id: 'b', user_id: 'me', created_at: '2026-07-16T03:00:00.000Z' },
      { id: 'c', user_id: 'you', created_at: '2026-07-16T02:00:00.000Z' },
    ] as any,
    'me',
  );

  assert.equal(myLatestCheckin?.id, 'b');
  assert.equal(partnerLatestCheckin?.id, 'c');
});

test('pickTodaysEvents filters out non-today records', () => {
  const events = pickTodaysEvents(
    [
      { id: 'today', start_time: '2026-07-16T09:00:00.000Z' },
      { id: 'later', start_time: '2026-07-18T09:00:00.000Z' },
    ] as any,
    new Date('2026-07-16T12:00:00.000Z'),
  );

  assert.deepEqual(events.map((event) => event.id), ['today']);
});

test('pickActiveEmergency returns the newest unresolved event', () => {
  const emergency = pickActiveEmergency(
    [
      { id: 'resolved', status: 'resolved', created_at: '2026-07-16T01:00:00.000Z' },
      { id: 'active', status: 'active', created_at: '2026-07-16T02:00:00.000Z' },
    ] as any,
  );

  assert.equal(emergency?.id, 'active');
});
