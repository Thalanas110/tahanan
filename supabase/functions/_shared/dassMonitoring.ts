import type { DassScores } from './dassEncryption.ts';

const CREATE_KEYS = ['coupleId', 'depression', 'anxiety', 'stress'] as const;
const HISTORY_KEYS = ['coupleId'] as const;
const BACKFILL_KEYS = [
  'coupleId',
  'takenOn',
  'depression',
  'anxiety',
  'stress',
] as const;

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

function manilaDate(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: 'year' | 'month' | 'day') => {
    const part = parts.find((candidate) => candidate.type === type)?.value;
    if (!part) throw new Error('Could not determine the Philippines date');
    return part;
  };

  return `${value('year')}-${value('month')}-${value('day')}`;
}

function requireTakenOn(value: unknown, now: Date): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('takenOn must be a calendar date');
  }

  const [year, month, day] = value.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth ||
    value > manilaDate(now)
  ) {
    throw new Error('takenOn must be a past or current Philippines date');
  }

  return new Date(`${value}T00:00:00.000+08:00`);
}

export function parseBackfillDassBody(
  value: unknown,
  now = new Date(),
): {
  coupleId: string;
  scores: DassScores;
  takenAt: Date;
} {
  const object = requireExactObject(value, BACKFILL_KEYS);
  if (typeof object.coupleId !== 'string' || object.coupleId.length === 0) {
    throw new Error('coupleId is required');
  }

  return {
    coupleId: object.coupleId,
    takenAt: requireTakenOn(object.takenOn, now),
    scores: {
      depression: requireFinalScore(object.depression),
      anxiety: requireFinalScore(object.anxiety),
      stress: requireFinalScore(object.stress),
    },
  };
}

export function getNextEligibleAt(takenAt: string): Date {
  const timestamp = Date.parse(takenAt);
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
