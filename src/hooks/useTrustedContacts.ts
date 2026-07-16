import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { TrustedContact, CoupleType } from '@/types/database';

export const trustedContactsQueryKey = (roomId: string | null, roomType: CoupleType) =>
  ['trusted-contacts', roomId, roomType] as const;

export function useTrustedContacts(roomId: string | null | undefined, roomType: CoupleType) {
  return useQuery({
    queryKey: trustedContactsQueryKey(roomId ?? null, roomType),
    enabled: !!roomId,
    queryFn: async () => {
      const idColumn = roomType === 'cof' ? 'cof_id' : 'couple_id';
      const { data, error } = await supabase
        .from('trusted_contacts')
        .select('*')
        .eq(idColumn, roomId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TrustedContact[];
    },
  });
}

export interface CreateTrustedContactInput {
  roomId: string;
  roomType: CoupleType;
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export function useCreateTrustedContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, roomType, ...input }: CreateTrustedContactInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('trusted_contacts')
        .insert({ 
          ...input, 
          couple_id: roomType === 'partner' ? roomId : null,
          cof_id: roomType === 'cof' ? roomId : null,
          created_by: userData.user.id 
        })
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
