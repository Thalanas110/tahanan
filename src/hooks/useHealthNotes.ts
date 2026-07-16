import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { HealthNote, CoupleType } from '@/types/database';

export const healthNotesQueryKey = (roomId: string | null, roomType: CoupleType) =>
  ['health-notes', roomId, roomType] as const;

export function useHealthNotes(roomId: string | null | undefined, roomType: CoupleType) {
  return useQuery({
    queryKey: healthNotesQueryKey(roomId ?? null, roomType),
    enabled: !!roomId,
    queryFn: async () => {
      const idColumn = roomType === 'cof' ? 'cof_id' : 'couple_id';
      const { data, error } = await supabase
        .from('health_notes')
        .select('*')
        .eq(idColumn, roomId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HealthNote[];
    },
  });
}

export interface CreateHealthNoteInput {
  roomId: string;
  roomType: CoupleType;
  health_type?: string;
  severity?: number;
  notes?: string;
  visible_to_partner?: boolean;
}

export function useCreateHealthNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, roomType, ...input }: CreateHealthNoteInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('health_notes')
        .insert({ 
          ...input, 
          couple_id: roomType === 'partner' ? roomId : null,
          cof_id: roomType === 'cof' ? roomId : null,
          user_id: userData.user.id, 
          visible_to_partner: input.visible_to_partner ?? false 
        })
        .select()
        .single();
      if (error) throw error;
      return data as HealthNote;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['health-notes'] }),
  });
}

export function useUpdateHealthNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HealthNote> & { id: string }) => {
      const { data, error } = await supabase
        .from('health_notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as HealthNote;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['health-notes'] }),
  });
}

export function useDeleteHealthNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('health_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['health-notes'] }),
  });
}
