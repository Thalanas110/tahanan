import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeEdgeFunction } from '@/lib/supabase';
import type { Couple, DailyCheckin, CalendarEvent, EmergencyEvent, Profile } from '@/types/database';

export interface DashboardSummary {
  couple: Couple | null;
  members: { user_id: string; profiles: Profile }[];
  myLatestCheckin: DailyCheckin | null;
  partnerLatestCheckin: DailyCheckin | null;
  todaysEvents: CalendarEvent[];
  activeEmergency: EmergencyEvent | null;
}

export const dashboardQueryKey = ['dashboard-summary'] as const;

export function useDashboard(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKey,
    queryFn: () => invokeEdgeFunction<DashboardSummary>('dashboard-summary'),
    enabled,
  });
}

export function useCreateCouple() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      invokeEdgeFunction<{ couple: Couple }>('create-couple', { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dashboardQueryKey }),
  });
}

export function useJoinCouple() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      invokeEdgeFunction<{ couple: { couple_id: string; couple_name: string } }>(
        'join-couple',
        { code },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dashboardQueryKey }),
  });
}

export function useUpdateCouple() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ coupleId, name }: { coupleId: string; name: string }) => {
      // Import supabase client dynamically to avoid circular dependencies if any
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('couples')
        .update({ name })
        .eq('id', coupleId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dashboardQueryKey }),
  });
}

