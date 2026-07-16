import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { LoveNote, CoupleType } from '@/types/database';

export const loveNotesQueryKey = (roomId: string | null, roomType: CoupleType) =>
  ['love-notes', roomId, roomType] as const;

export function useLoveNotes(roomId: string | null | undefined, roomType: CoupleType) {
  return useQuery({
    queryKey: loveNotesQueryKey(roomId ?? null, roomType),
    enabled: !!roomId,
    queryFn: async () => {
      const idColumn = roomType === 'cof' ? 'cof_id' : 'couple_id';
      const { data, error } = await supabase
        .from('love_notes')
        .select('*')
        .eq(idColumn, roomId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LoveNote[];
    },
  });
}

export interface CreateLoveNoteInput {
  roomId: string;
  roomType: CoupleType;
  title?: string;
  body: string;
  note_type?: string;
  recipient_id?: string;
  open_when?: string;
}

export function useCreateLoveNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, roomType, ...input }: CreateLoveNoteInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('love_notes')
        .insert({ 
          ...input, 
          couple_id: roomType === 'partner' ? roomId : null,
          cof_id: roomType === 'cof' ? roomId : null,
          created_by: userData.user.id 
        })
        .select()
        .single();
      if (error) throw error;
      return data as LoveNote;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['love-notes'] }),
  });
}

export function useToggleFavoriteLoveNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { data, error } = await supabase
        .from('love_notes')
        .update({ is_favorite })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as LoveNote;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['love-notes'] }),
  });
}

export function useUpdateLoveNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LoveNote> & { id: string }) => {
      const { data, error } = await supabase
        .from('love_notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as LoveNote;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['love-notes'] }),
  });
}

export function useDeleteLoveNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('love_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['love-notes'] }),
  });
}
