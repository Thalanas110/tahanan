import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DassScores } from '@/lib/dass21';
import { invokeEdgeFunction } from '@/lib/supabase';
import type { DassMonitoringEntry, DassMonitoringHistory } from '@/types/dassMonitoring';

interface CreateDassMonitoringResult {
  entry: DassMonitoringEntry;
  nextEligibleAt: string;
}

export const dassMonitoringQueryKey = (coupleId: string | null) =>
  ['dass-monitoring', coupleId] as const;

export function useDassMonitoring(coupleId: string | null, enabled: boolean) {
  const queryClient = useQueryClient();
  const historyQuery = useQuery({
    queryKey: dassMonitoringQueryKey(coupleId),
    enabled: enabled && !!coupleId,
    queryFn: () =>
      invokeEdgeFunction<DassMonitoringHistory>('get-dass-monitoring-history', {
        coupleId: coupleId!,
      }),
  });

  const createEntry = useMutation({
    mutationFn: (scores: DassScores) => {
      if (!coupleId) throw new Error('A partner space is required');
      return invokeEdgeFunction<CreateDassMonitoringResult>(
        'create-dass-monitoring-entry',
        { coupleId, ...scores },
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: dassMonitoringQueryKey(coupleId) }),
  });

  return { historyQuery, createEntry };
}
