import type { CoupleType } from '../types/database.ts';

export const ACTIVE_ROOM_SESSION_KEY = 'tahanan_active_room';

export type RoomIdentity = {
  id: string;
  name: string | null;
} | null;

type RoomDashboard = {
  couple: { id: string; name?: string | null } | null;
  cofCouple: { id: string; name?: string | null } | null;
} | null | undefined;

type DirectRooms = {
  partnerRoom: RoomIdentity;
  cofRoom: RoomIdentity;
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

export function resolveAvailableRooms(input: {
  dashboard: RoomDashboard;
  directRooms: DirectRooms;
}): {
  partnerRoom: RoomIdentity;
  cofRoom: RoomIdentity;
} {
  return {
    partnerRoom:
      input.directRooms?.partnerRoom ??
      (input.dashboard?.couple
        ? { id: input.dashboard.couple.id, name: input.dashboard.couple.name ?? null }
        : null),
    cofRoom:
      input.directRooms?.cofRoom ??
      (input.dashboard?.cofCouple
        ? { id: input.dashboard.cofCouple.id, name: input.dashboard.cofCouple.name ?? null }
        : null),
  };
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
