import type { CoupleType } from '../types/database.ts';

export function getMonthsaryComposerBlocker(input: {
  roomType: CoupleType;
  relationshipStartDate: string | null;
  partnerId: string | null | undefined;
  partnerLookupPending?: boolean;
}): string | null {
  if (input.roomType !== 'partner') {
    return 'Monthsary messages are only available in your partner space.';
  }

  if (!input.relationshipStartDate) {
    return 'Add your relationship start date in Settings to unlock monthsary messages.';
  }

  if (input.partnerLookupPending && !input.partnerId) {
    return 'Loading your partner details...';
  }

  if (!input.partnerId) {
    return 'Your partner needs to join this space before you can save a monthsary message.';
  }

  return null;
}
