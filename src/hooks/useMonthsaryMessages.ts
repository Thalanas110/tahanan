import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { MonthsaryMessage } from '@/types/database';

export const monthsaryMessagesQueryKey = (coupleId: string | null) =>
  ['monthsary-messages', coupleId] as const;

export function useMonthsaryMessages(coupleId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: monthsaryMessagesQueryKey(coupleId ?? null),
    enabled: enabled && !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthsary_messages')
        .select('*')
        .eq('couple_id', coupleId!)
        .is('completed_at', null)
        .order('target_monthsary_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as MonthsaryMessage[];
    },
  });
}

export function useCreateMonthsaryMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      couple_id: string;
      recipient_id: string | null;
      title: string | null;
      body: string;
      target_monthsary_date: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('monthsary_messages')
        .insert({ ...input, created_by: userData.user.id })
        .select()
        .single();

      if (error) throw error;
      return data as MonthsaryMessage;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: monthsaryMessagesQueryKey(input.couple_id) });
    },
  });
}

export function useUpdateMonthsaryMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MonthsaryMessage> & { id: string }) => {
      const { data, error } = await supabase
        .from('monthsary_messages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MonthsaryMessage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: monthsaryMessagesQueryKey(data.couple_id) });
    },
  });
}

export function useCompleteMonthsaryMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completedAt }: { id: string; completedAt: string }) => {
      const { data, error } = await supabase
        .from('monthsary_messages')
        .update({ completed_at: completedAt })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MonthsaryMessage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: monthsaryMessagesQueryKey(data.couple_id) });
    },
  });
}
