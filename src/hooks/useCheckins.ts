import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { dashboardQueryKey } from '@/hooks/useCouple';
import type { DailyCheckin } from '@/types/database';

export const checkinsQueryKey = (coupleId: string | null) =>
  ['checkins', coupleId] as const;

export function useCheckins(coupleId: string | null | undefined) {
  return useQuery({
    queryKey: checkinsQueryKey(coupleId ?? null),
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('couple_id', coupleId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as DailyCheckin[];
    },
  });
}

export interface CreateCheckinInput {
  couple_id: string;
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
    mutationFn: async (input: CreateCheckinInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('daily_checkins')
        .insert({ ...input, user_id: userData.user.id })
        .select()
        .single();
      if (error) throw error;
      return data as DailyCheckin;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: checkinsQueryKey(data.couple_id) });
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
