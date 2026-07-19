import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canDismissMonthsaryMessage,
  hasReachedMonthsaryMessageBottom,
} from './monthsaryMessageState.ts';

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

test('hasReachedMonthsaryMessageBottom treats a message with no overflow as already read', () => {
  assert.equal(
    hasReachedMonthsaryMessageBottom({
      scrollTop: 0,
      clientHeight: 240,
      scrollHeight: 240,
    }),
    true,
  );
});

test('hasReachedMonthsaryMessageBottom stays false until an overflowing message reaches its bottom', () => {
  assert.equal(
    hasReachedMonthsaryMessageBottom({
      scrollTop: 0,
      clientHeight: 240,
      scrollHeight: 600,
    }),
    false,
  );
  assert.equal(
    hasReachedMonthsaryMessageBottom({
      scrollTop: 352,
      clientHeight: 240,
      scrollHeight: 600,
    }),
    true,
  );
});
