import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCreateLoveNoteInput } from './loveNoteDraft.ts';

test('buildCreateLoveNoteInput keeps roomId and roomType for a cof note', () => {
  assert.deepEqual(
    buildCreateLoveNoteInput({
      roomId: 'cof-1',
      roomType: 'cof',
      recipientId: 'user-2',
      title: 'Ping',
      body: 'Lunch later?',
      openWhen: 'after work',
    }),
    {
      roomId: 'cof-1',
      roomType: 'cof',
      recipient_id: 'user-2',
      title: 'Ping',
      body: 'Lunch later?',
      open_when: 'after work',
    },
  );
});
