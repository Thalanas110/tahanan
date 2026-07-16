import type { CoupleType } from '../types/database.ts';

export const ACTIVE_ROOM_SESSION_KEY = 'tahanan_active_room';

type RoomIdentity = {
  id: string;
  name: string;
} | null;

type RoomDashboard = {
  couple: { id: string } | null;
  cofCouple: { id: string } | null;
} | null | undefined;

export function readStoredRoomType(
  storage: Pick<Storage, 'getItem'> | null | undefined,
): CoupleType {
  const stored = storage?.getItem(ACTIVE_ROOM_SESSION_KEY);
  return stored === 'cof' ? 'cof' : 'partner';
}

export function hasAnyRoom(input: RoomDashboard): boolean {
  return Boolean(input?.couple?.id || input?.cofCouple?.id);
}

export function resolveActiveRoomState(input: {
  storedType: CoupleType;
  partnerRoom: RoomIdentity;
  cofRoom: RoomIdentity;
}): {
  activeRoomType: CoupleType;
  activeRoomId: string | null;
  activeRoomName: string | null;
  hasCof: boolean;
} {
  const activeRoomType =
    input.storedType === 'cof'
      ? input.cofRoom
        ? 'cof'
        : input.partnerRoom
          ? 'partner'
          : 'cof'
      : input.partnerRoom
        ? 'partner'
        : input.cofRoom
          ? 'cof'
          : 'partner';

  const activeRoom = activeRoomType === 'cof' ? input.cofRoom : input.partnerRoom;

  return {
    activeRoomType,
    activeRoomId: activeRoom?.id ?? null,
    activeRoomName: activeRoom?.name ?? null,
    hasCof: Boolean(input.cofRoom),
  };
}
