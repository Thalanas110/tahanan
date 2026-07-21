export type DassScale = 'depression' | 'anxiety' | 'stress';
export type DassResponse = 0 | 1 | 2 | 3;
export type DassSeverity =
  | 'Normal'
  | 'Mild'
  | 'Moderate'
  | 'Severe'
  | 'Extremely Severe';

export interface DassQuestion {
  number: number;
  scale: DassScale;
  statement: string;
}

export interface DassScores {
  depression: number;
  anxiety: number;
  stress: number;
}

export const DASS_RESPONSE_OPTIONS: ReadonlyArray<{
  value: DassResponse;
  label: string;
}> = [
  { value: 0, label: 'Did not apply to me at all' },
  { value: 1, label: 'Applied to me to some degree, or some of the time' },
  {
    value: 2,
    label: 'Applied to me to a considerable degree or a good part of time',
  },
  { value: 3, label: 'Applied to me very much or most of the time' },
];

export const DASS_21_QUESTIONS: readonly DassQuestion[] = [
  { number: 1, scale: 'stress', statement: 'I found it hard to wind down' },
  { number: 2, scale: 'anxiety', statement: 'I was aware of dryness of my mouth' },
  {
    number: 3,
    scale: 'depression',
    statement: "I couldn't seem to experience any positive feeling at all",
  },
  {
    number: 4,
    scale: 'anxiety',
    statement:
      'I experienced breathing difficulty (e.g. excessively rapid breathing, breathlessness in the absence of physical exertion)',
  },
  {
    number: 5,
    scale: 'depression',
    statement: 'I found it difficult to work up the initiative to do things',
  },
  { number: 6, scale: 'stress', statement: 'I tended to over-react to situations' },
  {
    number: 7,
    scale: 'anxiety',
    statement: 'I experienced trembling (e.g. in the hands)',
  },
  {
    number: 8,
    scale: 'stress',
    statement: 'I felt that I was using a lot of nervous energy',
  },
  {
    number: 9,
    scale: 'anxiety',
    statement:
      'I was worried about situations in which I might panic and make a fool of myself',
  },
  {
    number: 10,
    scale: 'depression',
    statement: 'I felt that I had nothing to look forward to',
  },
  { number: 11, scale: 'stress', statement: 'I found myself getting agitated' },
  { number: 12, scale: 'stress', statement: 'I found it difficult to relax' },
  {
    number: 13,
    scale: 'depression',
    statement: 'I felt down-hearted and blue',
  },
  {
    number: 14,
    scale: 'stress',
    statement:
      'I was intolerant of anything that kept me from getting on with what I was doing',
  },
  { number: 15, scale: 'anxiety', statement: 'I felt I was close to panic' },
  {
    number: 16,
    scale: 'depression',
    statement: 'I was unable to become enthusiastic about anything',
  },
  {
    number: 17,
    scale: 'depression',
    statement: "I felt I wasn't worth much as a person",
  },
  { number: 18, scale: 'stress', statement: 'I felt that I was rather touchy' },
  {
    number: 19,
    scale: 'anxiety',
    statement:
      'I was aware of the action of my heart in the absence of physical exertion (e.g. sense of heart rate increase, heart missing a beat)',
  },
  {
    number: 20,
    scale: 'anxiety',
    statement: 'I felt scared without any good reason',
  },
  {
    number: 21,
    scale: 'depression',
    statement: 'I felt that life was meaningless',
  },
];

export function calculateDassScores(responses: readonly number[]): DassScores {
  if (responses.length !== DASS_21_QUESTIONS.length) {
    throw new Error('DASS-21 requires exactly 21 responses');
  }

  if (
    !responses.every(
      (response) =>
        Number.isInteger(response) && response >= 0 && response <= 3,
    )
  ) {
    throw new Error('Each DASS-21 response must be an integer from 0 through 3');
  }

  return DASS_21_QUESTIONS.reduce<DassScores>(
    (scores, question, index) => {
      scores[question.scale] += responses[index] * 2;
      return scores;
    },
    { depression: 0, anxiety: 0, stress: 0 },
  );
}

function isFinalDassScore(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 42
  );
}

export function validateDassScores(value: unknown): DassScores {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('DASS scores are required');
  }

  const scores = value as Partial<DassScores>;
  if (
    !isFinalDassScore(scores.depression) ||
    !isFinalDassScore(scores.anxiety) ||
    !isFinalDassScore(scores.stress)
  ) {
    throw new Error('DASS scores must be integers from 0 through 42');
  }

  return {
    depression: scores.depression,
    anxiety: scores.anxiety,
    stress: scores.stress,
  };
}

const DASS_SEVERITY_BANDS: Record<
  DassScale,
  ReadonlyArray<{ maximum: number; severity: DassSeverity }>
> = {
  depression: [
    { maximum: 9, severity: 'Normal' },
    { maximum: 13, severity: 'Mild' },
    { maximum: 20, severity: 'Moderate' },
    { maximum: 27, severity: 'Severe' },
    { maximum: 42, severity: 'Extremely Severe' },
  ],
  anxiety: [
    { maximum: 7, severity: 'Normal' },
    { maximum: 9, severity: 'Mild' },
    { maximum: 14, severity: 'Moderate' },
    { maximum: 19, severity: 'Severe' },
    { maximum: 42, severity: 'Extremely Severe' },
  ],
  stress: [
    { maximum: 14, severity: 'Normal' },
    { maximum: 18, severity: 'Mild' },
    { maximum: 25, severity: 'Moderate' },
    { maximum: 33, severity: 'Severe' },
    { maximum: 42, severity: 'Extremely Severe' },
  ],
};

export function getDassSeverity(
  scale: DassScale,
  score: number,
): DassSeverity {
  if (!Number.isInteger(score) || score < 0 || score > 42) {
    throw new Error('DASS score must be an integer from 0 through 42');
  }

  return (
    DASS_SEVERITY_BANDS[scale].find((band) => score <= band.maximum)
      ?.severity ?? 'Extremely Severe'
  );
}
