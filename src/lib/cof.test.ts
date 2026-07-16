import assert from 'node:assert/strict';
import test from 'node:test';

import { createCofRoom, joinCofRoom } from './cof.ts';

function makeRpcClient<T>(result: { data: T | null; error: { message: string } | null }) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];

  return {
    calls,
    client: {
      rpc<U>(name: string, args: Record<string, unknown>) {
        calls.push({ name, args });
        return {
          async single() {
            return result as { data: U | null; error: { message: string } | null };
          },
        };
      },
    },
  };
}

test('createCofRoom uses the create_cof_room rpc', async () => {
  const { calls, client } = makeRpcClient({
    data: {
      id: 'cof-1',
      name: 'Friends',
      invite_code: 'ABC123',
      created_by: 'user-1',
      created_at: '2026-07-15T00:00:00.000Z',
    },
    error: null,
  });

  const cof = await createCofRoom(client, 'Friends');

  assert.deepEqual(calls, [
    {
      name: 'create_cof_room',
      args: { room_name: 'Friends' },
    },
  ]);
  assert.equal(cof.name, 'Friends');
  assert.equal(cof.invite_code, 'ABC123');
});

test('joinCofRoom normalizes the code before calling the rpc', async () => {
  const { calls, client } = makeRpcClient({
    data: { cof_id: 'cof-1', cof_name: 'Friends' },
    error: null,
  });

  const result = await joinCofRoom(client, '  abc123  ');

  assert.deepEqual(calls, [
    {
      name: 'join_cof_by_code',
      args: { code: 'ABC123' },
    },
  ]);
  assert.equal(result.cof_id, 'cof-1');
  assert.equal(result.cof_name, 'Friends');
});

test('createCofRoom maps already-paired rpc errors to a user-facing message', async () => {
  const { client } = makeRpcClient({
    data: null,
    error: { message: 'ALREADY_PAIRED' },
  });

  await assert.rejects(
    () => createCofRoom(client, 'Friends'),
    /You are already part of a COF space/,
  );
});

test('joinCofRoom maps invalid-code rpc errors to a user-facing message', async () => {
  const { client } = makeRpcClient({
    data: null,
    error: { message: 'INVALID_CODE' },
  });

  await assert.rejects(
    () => joinCofRoom(client, 'abc123'),
    /That invite code was not found/,
  );
});
