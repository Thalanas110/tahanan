import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CoupleType, RoomMemberSummary } from '@/types/database';

export const roomMembersQueryKey = (roomId: string | null, roomType: CoupleType) =>
  ['room-members', roomId, roomType] as const;

export function useRoomMembers(roomId: string | null | undefined, roomType: CoupleType) {
  return useQuery({
    queryKey: roomMembersQueryKey(roomId ?? null, roomType),
    enabled: !!roomId,
    queryFn: async () => {
      const table = roomType === 'cof' ? 'cof_members' : 'couple_members';
      const idColumn = roomType === 'cof' ? 'cof_id' : 'couple_id';
      const { data, error } = await supabase
        .from(table)
        .select('user_id, profiles(id, display_name, avatar_url)')
        .eq(idColumn, roomId!);

      if (error) throw error;
      return (data ?? []).map((member) => ({
        user_id: member.user_id,
        profiles: Array.isArray(member.profiles)
          ? (member.profiles[0] ?? null)
          : (member.profiles ?? null),
      })) as RoomMemberSummary[];
    },
  });
}
