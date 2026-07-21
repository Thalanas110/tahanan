import {
  canReadDassEntry,
  getNextEligibleAt,
  parseCreateDassBody,
  parseHistoryDassBody,
} from './dassMonitoring.ts';
import * as dassMonitoring from './dassMonitoring.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown): void {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

function assertThrows(action: () => unknown): void {
  try {
    action();
  } catch {
    return;
  }
  throw new Error('Expected action to throw');
}

Deno.test('create parser accepts final scores only', () => {
  assertEquals(
    parseCreateDassBody({
      coupleId: 'couple-1',
      depression: 12,
      anxiety: 8,
      stress: 16,
    }),
    {
      coupleId: 'couple-1',
      scores: { depression: 12, anxiety: 8, stress: 16 },
    },
  );
});

Deno.test('request parsers reject answers, COF, sharing, and room fields', () => {
  assertThrows(() =>
    parseCreateDassBody({
      coupleId: 'couple-1',
      depression: 0,
      anxiety: 0,
      stress: 0,
      responses: Array(21).fill(0),
    }),
  );
  assertThrows(() =>
    parseCreateDassBody({
      coupleId: 'couple-1',
      depression: 0,
      anxiety: 0,
      stress: 0,
      cofId: 'cof-1',
    }),
  );
  assertThrows(() => parseHistoryDassBody({ coupleId: 'couple-1', roomType: 'cof' }));
});

Deno.test('only an author or their partner couple member can read', () => {
  assertEquals(
    canReadDassEntry({
      callerId: 'author',
      submittedBy: 'author',
      memberIds: ['author'],
    }),
    true,
  );
  assertEquals(
    canReadDassEntry({
      callerId: 'partner',
      submittedBy: 'author',
      memberIds: ['author', 'partner'],
    }),
    true,
  );
  assertEquals(
    canReadDassEntry({
      callerId: 'cof-member',
      submittedBy: 'author',
      memberIds: ['author', 'partner'],
    }),
    false,
  );
});

Deno.test('eligibility is exactly seven days after the entry timestamp', () => {
  assertEquals(
    getNextEligibleAt('2026-07-21T08:00:00.000Z').toISOString(),
    '2026-07-28T08:00:00.000Z',
  );
});

Deno.test('backfill parser is not exposed after the temporary import period', () => {
  const parseBackfillDassBody = (
    dassMonitoring as unknown as {
      parseBackfillDassBody?: (
        value: unknown,
        now?: Date,
      ) => {
        coupleId: string;
        scores: { depression: number; anxiety: number; stress: number };
        takenAt: Date;
      };
    }
  ).parseBackfillDassBody;

  assertEquals(typeof parseBackfillDassBody, 'undefined');
});
