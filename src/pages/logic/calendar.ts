import { useState } from "react";
import { useCalendarEvents, useCreateEvent, useDeleteEvent } from "@/hooks/useCalendar";
import { useDashboard } from "@/hooks/useCouple";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { toast } from "sonner";

export function useCalendarLogic() {
  const { data: events, isLoading } = useCalendarEvents();
  const createEvent = useCreateEvent();
  const deleteEvent = useDeleteEvent();
  const { data: dashboard } = useDashboard();
  const { user } = useAuth();
  
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("12:00");
  const [assignee, setAssignee] = useState("both");

  const myProfile = dashboard?.members.find(m => m.user_id === user?.id)?.profiles;
  const partnerProfile = dashboard?.members.find(m => m.user_id !== user?.id)?.profiles;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !dashboard?.couple?.id) return;

    try {
      const startTime = new Date(`${date}T${time}`).toISOString();
      await createEvent.mutateAsync({
        couple_id: dashboard.couple.id,
        title: title.trim(),
        start_time: startTime,
        assigned_to: assignee === "both" ? undefined : assignee,
      });
      toast.success("Event added");
      setIsAdding(false);
      setTitle("");
    } catch (err) {
      toast.error("Failed to add event");
    }
  }

  // Group events by day
  const groupedEvents = (events || []).reduce((acc: Record<string, any[]>, event) => {
    const day = format(new Date(event.start_time), "yyyy-MM-dd");
    if (!acc[day]) acc[day] = [];
    acc[day].push(event);
    return acc;
  }, {});

  const sortedDays = Object.keys(groupedEvents).sort();

  return {
    events,
    isLoading,
    createEvent,
    deleteEvent,
    dashboard,
    user,
    isAdding,
    setIsAdding,
    title,
    setTitle,
    date,
    setDate,
    time,
    setTime,
    assignee,
    setAssignee,
    myProfile,
    partnerProfile,
    handleSubmit,
    groupedEvents,
    sortedDays,
  };
}
