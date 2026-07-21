import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DASS_21_QUESTIONS,
  calculateDassScores,
  getDassSeverity,
  validateDassScores,
} from './dass21.ts';

test('uses the exact seven-question DASS-21 subscales', () => {
  assert.deepEqual(
    DASS_21_QUESTIONS.filter((question) => question.scale === 'depression').map(
      (question) => question.number,
    ),
    [3, 5, 10, 13, 16, 17, 21],
  );
  assert.deepEqual(
    DASS_21_QUESTIONS.filter((question) => question.scale === 'anxiety').map(
      (question) => question.number,
    ),
    [2, 4, 7, 9, 15, 19, 20],
  );
  assert.deepEqual(
    DASS_21_QUESTIONS.filter((question) => question.scale === 'stress').map(
      (question) => question.number,
    ),
    [1, 6, 8, 11, 12, 14, 18],
  );
});

test('doubles each DASS-21 subscale subtotal', () => {
  assert.deepEqual(calculateDassScores(Array(21).fill(1)), {
    depression: 14,
    anxiety: 14,
    stress: 14,
  });
});

test('rejects incomplete or invalid DASS-21 answers', () => {
  assert.throws(() => calculateDassScores(Array(20).fill(0)), /21 responses/);
  assert.throws(
    () => calculateDassScores([...Array(20).fill(0), 4]),
    /0 through 3/,
  );
});

test('permits only final even DASS-21 scores from zero through 42', () => {
  assert.deepEqual(validateDassScores({ depression: 0, anxiety: 42, stress: 14 }), {
    depression: 0,
    anxiety: 42,
    stress: 14,
  });
  assert.throws(
    () => validateDassScores({ depression: 9, anxiety: 0, stress: 0 }),
    /even/,
  );
  assert.throws(
    () => validateDassScores({ depression: 44, anxiety: 0, stress: 0 }),
    /0 through 42/,
  );
});

test('uses supplied DASS-21 score bands as non-diagnostic labels', () => {
  assert.equal(getDassSeverity('depression', 9), 'Normal');
  assert.equal(getDassSeverity('depression', 10), 'Mild');
  assert.equal(getDassSeverity('anxiety', 14), 'Moderate');
  assert.equal(getDassSeverity('stress', 33), 'Severe');
  assert.equal(getDassSeverity('stress', 34), 'Extremely Severe');
});
