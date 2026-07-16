import type { RoomMemberSummary } from '../types/database.ts';

export function getMyMember(
  members: RoomMemberSummary[],
  userId: string | null | undefined,
): RoomMemberSummary | null {
  return members.find((member) => member.user_id === userId) ?? null;
}

export function getPartnerMember(
  members: RoomMemberSummary[],
  userId: string | null | undefined,
): RoomMemberSummary | null {
  return members.find((member) => member.user_id !== userId) ?? null;
}

export function getAssigneeName(
  members: RoomMemberSummary[],
  assigneeId: string | null | undefined,
): string | null {
  if (!assigneeId) return null;
  return members.find((member) => member.user_id === assigneeId)?.profiles?.display_name ?? null;
}
