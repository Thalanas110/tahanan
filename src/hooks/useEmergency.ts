import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, invokeEdgeFunction } from '@/lib/supabase';
import { dashboardQueryKey } from '@/hooks/useCouple';
import type { EmergencyEvent } from '@/types/database';

export const emergencyQueryKey = ['emergency-events'] as const;

export function useEmergencyEvents(coupleId: string | null | undefined) {
  return useQuery({
    queryKey: ['emergency-events', coupleId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('emergency_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (coupleId) {
        query = query.eq('couple_id', coupleId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as EmergencyEvent[];
    },
  });
}

/** Subscribes to Realtime inserts/updates on emergency_events for the
 * caller's couple so the partner's screen updates immediately without a
 * page reload. Pass the couple_id once it's known (e.g. from useDashboard). */
export function useEmergencyRealtime(coupleId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`emergency-events-${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_events',
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: emergencyQueryKey });
          queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, queryClient]);
}

export function useTriggerSos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { message?: string; locationNote?: string; latitude?: number; longitude?: number }) =>
      invokeEdgeFunction<{ emergency: EmergencyEvent }>('trigger-sos', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emergencyQueryKey });
      queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
  });
}

export function useAcknowledgeSos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (emergencyId: string) =>
      invokeEdgeFunction<{ emergency: EmergencyEvent }>('acknowledge-sos', { emergencyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emergencyQueryKey });
      queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
  });
}

export function useResolveSos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (emergencyId: string) =>
      invokeEdgeFunction<{ emergency: EmergencyEvent }>('resolve-sos', { emergencyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emergencyQueryKey });
      queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
  });
}
