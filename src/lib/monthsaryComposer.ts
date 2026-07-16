import type { CoupleType } from '../types/database.ts';

export function getMonthsaryComposerBlocker(input: {
  roomType: CoupleType;
  relationshipStartDate: string | null;
}): string | null {
  if (input.roomType !== 'partner') {
    return 'Monthsary messages are only available in your partner space.';
  }

  if (!input.relationshipStartDate) {
    return 'Add your relationship start date in Settings to unlock monthsary messages.';
  }

  return null;
}
