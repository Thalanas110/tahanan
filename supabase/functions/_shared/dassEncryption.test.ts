import {
  decryptDassScores,
  encryptDassScores,
} from './dassEncryption.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown): void {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

async function assertRejects(action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch {
    return;
  }
  throw new Error('Expected action to reject');
}

Deno.test('envelope encryption round-trips a DASS score bundle', async () => {
  const kek = crypto.getRandomValues(new Uint8Array(32));
  const context = {
    recordId: crypto.randomUUID(),
    coupleId: 'couple-1',
    submittedBy: 'author-1',
    keyVersion: 'v1',
  };
  const scores = { depression: 28, anxiety: 34, stress: 39 };

  const encrypted = await encryptDassScores(scores, kek, context);

  assert(encrypted.ciphertext !== JSON.stringify(scores), 'payload must be encrypted');
  assert(encrypted.wrappedDataKey.length > 0, 'DEK must be wrapped');
  assertEquals(await decryptDassScores(encrypted, kek, context), scores);
});

Deno.test('envelope encryption rejects modified ciphertext and AAD', async () => {
  const kek = crypto.getRandomValues(new Uint8Array(32));
  const context = {
    recordId: crypto.randomUUID(),
    coupleId: 'couple-1',
    submittedBy: 'author-1',
    keyVersion: 'v1',
  };
  const encrypted = await encryptDassScores(
    { depression: 0, anxiety: 2, stress: 4 },
    kek,
    context,
  );

  await assertRejects(() =>
    decryptDassScores(
      { ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -2)}AA` },
      kek,
      context,
    ),
  );
  await assertRejects(() =>
    decryptDassScores(encrypted, kek, { ...context, coupleId: 'other-couple' }),
  );
  await assertRejects(() =>
    decryptDassScores(
      { ...encrypted, wrappedDataKey: `${encrypted.wrappedDataKey.slice(0, -2)}AA` },
      kek,
      context,
    ),
  );
});
