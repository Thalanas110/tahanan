import assert from 'node:assert/strict';
import test from 'node:test';

import { getMonthsaryComposerBlocker } from './monthsaryComposer.ts';

test('getMonthsaryComposerBlocker asks for the relationship start date before enabling monthsary messages', () => {
  assert.equal(
    getMonthsaryComposerBlocker({
      roomType: 'partner',
      relationshipStartDate: null,
    }),
    'Add your relationship start date in Settings to unlock monthsary messages.',
  );
});

test('getMonthsaryComposerBlocker allows saving before a partner joins', () => {
  assert.equal(
    getMonthsaryComposerBlocker({
      roomType: 'partner',
      relationshipStartDate: '2026-07-16',
    }),
    null,
  );
});
