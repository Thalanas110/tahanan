import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasAnyRoom,
  readStoredRoomType,
  resolveAvailableRooms,
  resolveActiveRoomState,
} from './activeRoomState.ts';

test('readStoredRoomType accepts only partner or cof', () => {
  assert.equal(readStoredRoomType({ getItem: () => 'partner' }), 'partner');
  assert.equal(readStoredRoomType({ getItem: () => 'cof' }), 'cof');
  assert.equal(readStoredRoomType({ getItem: () => 'junk' }), 'partner');
});

test('resolveActiveRoomState falls back to cof when partner room is missing', () => {
  assert.deepEqual(
    resolveActiveRoomState({
      storedType: 'partner',
      partnerRoom: null,
      cofRoom: { id: 'cof-1', name: 'Circle' },
    }),
    {
      activeRoomType: 'cof',
      activeRoomId: 'cof-1',
      activeRoomName: 'Circle',
      hasCof: true,
    },
  );
});

test('hasAnyRoom treats a cof-only dashboard as paired', () => {
  assert.equal(hasAnyRoom({ couple: null, cofCouple: { id: 'cof-1' } }), true);
  assert.equal(hasAnyRoom({ couple: null, cofCouple: null }), false);
});

test('resolveAvailableRooms keeps direct room data when dashboard misses the cof room', () => {
  assert.deepEqual(
    resolveAvailableRooms({
      dashboard: {
        couple: { id: 'partner-1', name: 'Residence' },
        cofCouple: null,
      },
      directRooms: {
        partnerRoom: { id: 'partner-1', name: 'Residence' },
        cofRoom: { id: 'cof-1', name: 'The Cinco 3' },
      },
    }),
    {
      partnerRoom: { id: 'partner-1', name: 'Residence' },
      cofRoom: { id: 'cof-1', name: 'The Cinco 3' },
    },
  );
});
