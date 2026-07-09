import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { LoveNote } from '@/types/database';

export const loveNotesQueryKey = ['love-notes'] as const;

export function useLoveNotes() {
  return useQuery({
    queryKey: loveNotesQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('love_notes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LoveNote[];
    },
  });
}

export interface CreateLoveNoteInput {
  couple_id: string;
  title?: string;
  body: string;
  note_type?: string;
  recipient_id?: string;
  open_when?: string;
}

export function useCreateLoveNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLoveNoteInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('love_notes')
        .insert({ ...input, created_by: userData.user.id })
        .select()
        .single();
      if (error) throw error;
      return data as LoveNote;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loveNotesQueryKey }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loveNotesQueryKey }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loveNotesQueryKey }),
  });
}

export function useDeleteLoveNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('love_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loveNotesQueryKey }),
  });
}
