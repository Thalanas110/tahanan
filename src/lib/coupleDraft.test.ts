import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCreateCoupleInput, buildUpdateCouplePatch } from './coupleDraft.ts';

test('buildCreateCoupleInput trims the name and keeps the relationship start date', () => {
  assert.deepEqual(
    buildCreateCoupleInput({
      name: '  Home Base  ',
      relationshipStartDate: '2026-07-16',
    }),
    {
      name: 'Home Base',
      relationshipStartDate: '2026-07-16',
    },
  );
});

test('buildUpdateCouplePatch maps relationshipStartDate to relationship_start_date', () => {
  assert.deepEqual(
    buildUpdateCouplePatch({
      name: '  Shared Space  ',
      relationshipStartDate: '2026-07-16',
    }),
    {
      name: 'Shared Space',
      relationship_start_date: '2026-07-16',
    },
  );
});
