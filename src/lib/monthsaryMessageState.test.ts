import assert from 'node:assert/strict';
import test from 'node:test';

import { canDismissMonthsaryMessage } from './monthsaryMessageState.ts';

test('canDismissMonthsaryMessage stays locked before ten seconds', () => {
  assert.equal(
    canDismissMonthsaryMessage({
      openedAt: 0,
      now: 9_000,
      hasReachedBottom: true,
    }),
    false,
  );
});

test('canDismissMonthsaryMessage stays locked until the user reaches the bottom', () => {
  assert.equal(
    canDismissMonthsaryMessage({
      openedAt: 0,
      now: 12_000,
      hasReachedBottom: false,
    }),
    false,
  );
});

test('canDismissMonthsaryMessage unlocks only after both conditions are met', () => {
  assert.equal(
    canDismissMonthsaryMessage({
      openedAt: 0,
      now: 12_000,
      hasReachedBottom: true,
    }),
    true,
  );
});
