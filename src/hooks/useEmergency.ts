import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, invokeEdgeFunction } from '@/lib/supabase';
import { dashboardQueryKey } from '@/hooks/useCouple';
import type { EmergencyEvent, CoupleType } from '@/types/database';

export const emergencyQueryKey = ['emergency-events'] as const;

export function useEmergencyEvents(roomId: string | null | undefined, roomType?: CoupleType) {
  return useQuery({
    queryKey: ['emergency-events', roomId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('emergency_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (roomId && roomType) {
        query = query.eq(roomType === 'cof' ? 'cof_id' : 'couple_id', roomId);
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
export function useEmergencyRealtime(roomId: string | null | undefined, roomType: CoupleType) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`emergency-events-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_events',
          filter: `${roomType === 'cof' ? 'cof_id' : 'couple_id'}=eq.${roomId}`,
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
  }, [roomId, roomType, queryClient]);
}

export function useTriggerSos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { roomId: string; roomType: string; message?: string; locationNote?: string; latitude?: number; longitude?: number }) =>
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
