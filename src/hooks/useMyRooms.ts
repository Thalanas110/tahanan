import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { RoomIdentity } from "@/context/activeRoomState";

export interface MyRoomsSummary {
  partnerRoom: RoomIdentity;
  cofRoom: RoomIdentity;
}

export function useMyRooms(enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-rooms", user?.id],
    enabled: enabled && !!user,
    queryFn: async (): Promise<MyRoomsSummary> => {
      const [{ data: partnerMembership, error: partnerError }, { data: cofMembership, error: cofError }] =
        await Promise.all([
          supabase
            .from("couple_members")
            .select("couple_id")
            .eq("user_id", user!.id)
            .maybeSingle(),
          supabase
            .from("cof_members")
            .select("cof_id")
            .eq("user_id", user!.id)
            .maybeSingle(),
        ]);

      if (partnerError) throw partnerError;
      if (cofError) throw cofError;

      const [{ data: partnerRoomRow }, { data: cofRoomRow }] = await Promise.all([
        partnerMembership?.couple_id
          ? supabase
              .from("couples")
              .select("id, name")
              .eq("id", partnerMembership.couple_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        cofMembership?.cof_id
          ? supabase
              .from("cofs")
              .select("id, name")
              .eq("id", cofMembership.cof_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return {
        partnerRoom: partnerMembership?.couple_id
          ? {
              id: partnerMembership.couple_id,
              name: (partnerRoomRow as { name?: string | null } | null)?.name ?? null,
            }
          : null,
        cofRoom: cofMembership?.cof_id
          ? {
              id: cofMembership.cof_id,
              name: (cofRoomRow as { name?: string | null } | null)?.name ?? null,
            }
          : null,
      };
    },
  });
}
