import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { dashboardQueryKey } from '@/hooks/useCouple';
import type { DailyCheckin, CoupleType } from '@/types/database';

export const checkinsQueryKey = (roomId: string | null, roomType: CoupleType) =>
  ['checkins', roomId, roomType] as const;

export function useCheckins(roomId: string | null | undefined, roomType: CoupleType) {
  return useQuery({
    queryKey: checkinsQueryKey(roomId ?? null, roomType),
    enabled: !!roomId,
    queryFn: async () => {
      const idColumn = roomType === 'cof' ? 'cof_id' : 'couple_id';
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq(idColumn, roomId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as DailyCheckin[];
    },
  });
}

export interface CreateCheckinInput {
  roomId: string;
  roomType: CoupleType;
  mood: string;
  energy_level: number;
  health_status?: string;
  safety_status?: string;
  note?: string;
  is_private?: boolean;
}

export function useCreateCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, roomType, ...input }: CreateCheckinInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('daily_checkins')
        .insert({ 
          ...input, 
          couple_id: roomType === 'partner' ? roomId : null,
          cof_id: roomType === 'cof' ? roomId : null,
          user_id: userData.user.id 
        })
        .select()
        .single();
      if (error) throw error;
      return { data: data as DailyCheckin, roomType };
    },
    onSuccess: ({ data, roomType }) => {
      const roomId = roomType === 'cof' ? data.cof_id : data.couple_id;
      queryClient.invalidateQueries({ queryKey: checkinsQueryKey(roomId, roomType) });
      queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
  });
}

export function useUpdateCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DailyCheckin> & { id: string }) => {
      const { data, error } = await supabase
        .from('daily_checkins')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as DailyCheckin;
    },
    onSuccess: () => {
      // Invalidate all checkin queries regardless of coupleId
      queryClient.invalidateQueries({ queryKey: ['checkins'] });
      queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
  });
}
