import type { CoupleType } from '@/types/database';

interface DassEntryIdentity {
  submittedBy: string;
}

export function canBeginDassAssessment({
  activeRoomType,
  coupleId,
  nextEligibleAt,
  now = new Date(),
}: {
  activeRoomType: CoupleType;
  coupleId: string | null;
  nextEligibleAt: string | null;
  now?: Date;
}) {
  if (activeRoomType !== 'partner' || !coupleId) return false;
  return !nextEligibleAt || new Date(nextEligibleAt) <= now;
}

export function entriesVisibleInPartnerSpace<T extends DassEntryIdentity>(
  entries: T[],
  memberIds: string[],
) {
  const partnerIds = new Set(memberIds.slice(0, 2));
  return entries.filter((entry) => partnerIds.has(entry.submittedBy));
}
