import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCurrentCouple } from './coupleSource.ts';

const baseCouple = {
  id: 'couple-1',
  name: 'Shared Space',
  invite_code: 'ABC123',
  created_by: 'user-1',
  relationship_start_date: null,
  created_at: '2026-07-16T00:00:00.000Z',
};

test('resolveCurrentCouple prefers the direct couple row when the dashboard payload is stale', () => {
  const resolved = resolveCurrentCouple({
    dashboardCouple: baseCouple,
    directCouple: {
      ...baseCouple,
      relationship_start_date: '2026-07-16',
    },
  });

  assert.equal(resolved?.relationship_start_date, '2026-07-16');
});

test('resolveCurrentCouple falls back to the dashboard couple while the direct row is loading', () => {
  const resolved = resolveCurrentCouple({
    dashboardCouple: {
      ...baseCouple,
      relationship_start_date: '2026-07-16',
    },
    directCouple: null,
  });

  assert.equal(resolved?.relationship_start_date, '2026-07-16');
});

test('resolveCurrentCouple returns null when neither source exists', () => {
  assert.equal(
    resolveCurrentCouple({
      dashboardCouple: null,
      directCouple: null,
    }),
    null,
  );
});
