import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAssigneeName,
  getMyMember,
  getPartnerMember,
} from './roomParticipants.ts';

const members = [
  { user_id: 'me', profiles: { id: 'me', display_name: 'Adriaan', avatar_url: null } },
  { user_id: 'you', profiles: { id: 'you', display_name: 'Mika', avatar_url: null } },
];

test('getMyMember returns the signed-in user for the active room roster', () => {
  assert.equal(getMyMember(members, 'me')?.profiles?.display_name, 'Adriaan');
});

test('getPartnerMember returns the non-user participant for the active room roster', () => {
  assert.equal(getPartnerMember(members, 'me')?.user_id, 'you');
});

test('getAssigneeName resolves assignee names from the active room roster', () => {
  assert.equal(getAssigneeName(members, 'you'), 'Mika');
  assert.equal(getAssigneeName(members, null), null);
});
