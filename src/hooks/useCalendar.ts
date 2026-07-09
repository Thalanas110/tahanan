import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { startOfDay, differenceInDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { dashboardQueryKey } from '@/hooks/useCouple';
import type { CalendarEvent } from '@/types/database';

export const calendarQueryKey = ['calendar-events'] as const;

export function useCalendarEvents() {
  return useQuery({
    queryKey: calendarQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data as CalendarEvent[];
    },
  });
}

export function useUpcomingMilestone() {
  const { data: events } = useCalendarEvents();

  return useMemo(() => {
    if (!events) return null;
    const now = startOfDay(new Date());

    const milestoneEvents = events.filter(e => {
      const title = e.title.toLowerCase();
      return title.includes('anniversary') || title.includes('monthsary');
    });

    const upcoming = milestoneEvents
      .filter(e => {
        const eventDate = startOfDay(new Date(e.start_time));
        return eventDate >= now;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    if (upcoming.length === 0) return null;

    const nextEvent = upcoming[0];
    const eventDate = startOfDay(new Date(nextEvent.start_time));
    const daysLeft = differenceInDays(eventDate, now);
    const isAnniversary = nextEvent.title.toLowerCase().includes('anniversary');

    return {
      event: nextEvent,
      daysLeft,
      type: isAnniversary ? 'Anniversary' : 'Monthsary'
    };
  }, [events]);
}

export interface CreateEventInput {
  couple_id: string;
  title: string;
  description?: string;
  event_type?: string;
  start_time: string;
  end_time?: string;
  assigned_to?: string;
  is_private?: boolean;
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({ ...input, created_by: userData.user.id })
        .select()
        .single();
      if (error) throw error;
      return data as CalendarEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarQueryKey });
      queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CalendarEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as CalendarEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarQueryKey });
      queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarQueryKey }),
  });
}
