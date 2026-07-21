import type { DassScores } from './dassEncryption.ts';

const CREATE_KEYS = ['coupleId', 'depression', 'anxiety', 'stress'] as const;
const HISTORY_KEYS = ['coupleId'] as const;

function requireExactObject(
  value: unknown,
  expectedKeys: readonly string[],
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid DASS monitoring request');
  }

  const object = value as Record<string, unknown>;
  const keys = Object.keys(object).sort();
  const expected = [...expectedKeys].sort();
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index])
  ) {
    throw new Error('Unsupported DASS monitoring input');
  }

  return object;
}

function requireFinalScore(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 42 ||
    value % 2 !== 0
  ) {
    throw new Error('DASS scores must be even integers from 0 through 42');
  }
  return value;
}

export function parseCreateDassBody(value: unknown): {
  coupleId: string;
  scores: DassScores;
} {
  const object = requireExactObject(value, CREATE_KEYS);
  if (typeof object.coupleId !== 'string' || object.coupleId.length === 0) {
    throw new Error('coupleId is required');
  }

  return {
    coupleId: object.coupleId,
    scores: {
      depression: requireFinalScore(object.depression),
      anxiety: requireFinalScore(object.anxiety),
      stress: requireFinalScore(object.stress),
    },
  };
}

export function parseHistoryDassBody(value: unknown): { coupleId: string } {
  const object = requireExactObject(value, HISTORY_KEYS);
  if (typeof object.coupleId !== 'string' || object.coupleId.length === 0) {
    throw new Error('coupleId is required');
  }
  return { coupleId: object.coupleId };
}

export function getNextEligibleAt(createdAt: string): Date {
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) {
    throw new Error('Invalid DASS monitoring timestamp');
  }
  return new Date(timestamp + 7 * 24 * 60 * 60 * 1000);
}

export function canReadDassEntry(input: {
  callerId: string;
  submittedBy: string;
  memberIds: readonly string[];
}): boolean {
  const memberIds = new Set(input.memberIds);
  return (
    input.memberIds.length >= 1 &&
    input.memberIds.length <= 2 &&
    memberIds.size === input.memberIds.length &&
    memberIds.has(input.submittedBy) &&
    memberIds.has(input.callerId)
  );
}
