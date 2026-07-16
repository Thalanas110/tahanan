import assert from 'node:assert/strict';
import test from 'node:test';

import { getMonthsaryComposerBlocker } from './monthsaryComposer.ts';

test('getMonthsaryComposerBlocker asks for the relationship start date before enabling monthsary messages', () => {
  assert.equal(
    getMonthsaryComposerBlocker({
      roomType: 'partner',
      relationshipStartDate: null,
      partnerId: 'partner-1',
      partnerLookupPending: false,
    }),
    'Add your relationship start date in Settings to unlock monthsary messages.',
  );
});

test('getMonthsaryComposerBlocker waits for partner details instead of failing silently', () => {
  assert.equal(
    getMonthsaryComposerBlocker({
      roomType: 'partner',
      relationshipStartDate: '2026-07-16',
      partnerId: null,
      partnerLookupPending: true,
    }),
    'Loading your partner details...',
  );
});

test('getMonthsaryComposerBlocker explains that a partner must join before saving', () => {
  assert.equal(
    getMonthsaryComposerBlocker({
      roomType: 'partner',
      relationshipStartDate: '2026-07-16',
      partnerId: null,
      partnerLookupPending: false,
    }),
    'Your partner needs to join this space before you can save a monthsary message.',
  );
});

test('getMonthsaryComposerBlocker allows saving once the partner is known', () => {
  assert.equal(
    getMonthsaryComposerBlocker({
      roomType: 'partner',
      relationshipStartDate: '2026-07-16',
      partnerId: 'partner-1',
      partnerLookupPending: false,
    }),
    null,
  );
});
