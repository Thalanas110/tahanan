import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Task, TaskStatus, CoupleType } from '@/types/database';

export const tasksQueryKey = (roomId: string | null, roomType: CoupleType) =>
  ['tasks', roomId, roomType] as const;

export function useTasks(roomId: string | null | undefined, roomType: CoupleType) {
  return useQuery({
    queryKey: tasksQueryKey(roomId ?? null, roomType),
    enabled: !!roomId,
    queryFn: async () => {
      const idColumn = roomType === 'cof' ? 'cof_id' : 'couple_id';
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq(idColumn, roomId!)
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
  });
}

export interface CreateTaskInput {
  roomId: string;
  roomType: CoupleType;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  due_date?: string;
  assigned_to?: string;
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, roomType, ...input }: CreateTaskInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('tasks')
        .insert({ 
          ...input, 
          couple_id: roomType === 'partner' ? roomId : null,
          cof_id: roomType === 'cof' ? roomId : null,
          created_by: userData.user.id 
        })
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
