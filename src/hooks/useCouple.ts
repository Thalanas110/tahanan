import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buildUpdateCouplePatch } from '@/lib/coupleDraft';
import { invokeEdgeFunction, supabase } from '@/lib/supabase';
import type { Couple, DailyCheckin, CalendarEvent, EmergencyEvent, Profile, CoupleType, Cof, CofMember } from '@/types/database';

export interface DashboardSummary {
  couple: Couple | null;
  /** The user's Close/Couple of Friends space, if one exists. */
  cofCouple: Cof | null;
  members: { user_id: string; profiles: Profile }[];
  myLatestCheckin: DailyCheckin | null;
  partnerLatestCheckin: DailyCheckin | null;
  todaysEvents: CalendarEvent[];
  activeEmergency: EmergencyEvent | null;
}

export const dashboardQueryKey = ['dashboard-summary'] as const;
export const coupleQueryKey = (coupleId: string | null) => ['couple', coupleId] as const;

export function useDashboard(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKey,
    queryFn: () => invokeEdgeFunction<DashboardSummary>('dashboard-summary'),
    enabled,
  });
}

export function useCoupleRecord(coupleId: string | null, enabled = true) {
  return useQuery({
    queryKey: coupleQueryKey(coupleId),
    enabled: enabled && !!coupleId,
    queryFn: async (): Promise<Couple> => {
      const { data, error } = await supabase
        .from('couples')
        .select('*')
        .eq('id', coupleId!)
        .single();

      if (error) throw error;
      return data as Couple;
    },
  });
}

export function useCreateCouple() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, relationshipStartDate }: { name: string; relationshipStartDate: string }) =>
      invokeEdgeFunction<{ couple: Couple }>('create-couple', {
        name,
        relationshipStartDate,
      }),
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
    mutationFn: async ({
      coupleId,
      name,
      relationshipStartDate,
    }: {
      coupleId: string;
      name?: string;
      relationshipStartDate?: string;
    }) => {
      const { data, error } = await supabase
        .from('couples')
        .update(buildUpdateCouplePatch({ name, relationshipStartDate }))
        .eq('id', coupleId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Couple;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(coupleQueryKey(data.id), data);
      void queryClient.invalidateQueries({ queryKey: coupleQueryKey(data.id) });
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
  });
}

