import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { dashboardQueryKey } from '@/hooks/useCouple';
import type { DailyCheckin } from '@/types/database';

export const checkinsQueryKey = ['checkins'] as const;

export function useCheckins() {
  return useQuery({
    queryKey: checkinsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkinsQueryKey });
      queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
  });
}
