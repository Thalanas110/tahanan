import type { CoupleType } from '@/types/database';

export interface MoreNavItemVisibility {
  href?: string;
  cofOnly?: boolean;
  partnerOnly?: boolean;
}

export function isMoreNavItemVisible(
  item: MoreNavItemVisibility,
  hasCof: boolean,
  activeRoomType: CoupleType,
) {
  if (item.cofOnly && !hasCof) return false;
  if (item.partnerOnly && activeRoomType !== 'partner') return false;
  return true;
}
