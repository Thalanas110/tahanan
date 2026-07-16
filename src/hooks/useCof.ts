import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCofRoom, joinCofRoom } from '@/lib/cof';
import { supabase } from '@/lib/supabase';
import type { Cof } from '@/types/database';
import { dashboardQueryKey } from './useCouple';

export function useCreateCof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) =>
      createCofRoom(supabase, name).then((cof) => ({ cof })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dashboardQueryKey }),
  });
}

export function useJoinCof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      joinCofRoom(supabase, code).then((cof) => ({ cof })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dashboardQueryKey }),
  });
}
