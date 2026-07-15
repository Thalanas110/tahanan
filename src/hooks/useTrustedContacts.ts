import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { TrustedContact } from '@/types/database';

export const trustedContactsQueryKey = (coupleId: string | null) =>
  ['trusted-contacts', coupleId] as const;

export function useTrustedContacts(coupleId: string | null | undefined) {
  return useQuery({
    queryKey: trustedContactsQueryKey(coupleId ?? null),
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trusted_contacts')
        .select('*')
        .eq('couple_id', coupleId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TrustedContact[];
    },
  });
}

export interface CreateTrustedContactInput {
  couple_id: string;
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export function useCreateTrustedContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTrustedContactInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('trusted_contacts')
        .insert({ ...input, created_by: userData.user.id })
        .select()
        .single();
      if (error) throw error;
      return data as TrustedContact;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trusted-contacts'] }),
  });
}

export function useDeleteTrustedContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trusted_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trusted-contacts'] }),
  });
}
