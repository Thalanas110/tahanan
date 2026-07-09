import { useState } from "react";
import { useCalendarEvents, useCreateEvent, useDeleteEvent, useUpdateEvent } from "@/hooks/useCalendar";
import { useDashboard } from "@/hooks/useCouple";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { toast } from "sonner";

export function useCalendarLogic() {
  const { data: events, isLoading } = useCalendarEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const { data: dashboard } = useDashboard();
  const { user } = useAuth();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("12:00");
  const [assignee, setAssignee] = useState("both");

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setTitle("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setTime("12:00");
    setAssignee("both");
  };

  function handleEdit(event: any) {
    setEditingId(event.id);
    setTitle(event.title || "");
    setDate(format(new Date(event.start_time), "yyyy-MM-dd"));
    setTime(format(new Date(event.start_time), "HH:mm"));
    setAssignee(event.assigned_to || "both");
    setIsAdding(true);
  }

  const myProfile = dashboard?.members.find(m => m.user_id === user?.id)?.profiles;
  const partnerProfile = dashboard?.members.find(m => m.user_id !== user?.id)?.profiles;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !dashboard?.couple?.id) return;

    try {
      const startTime = new Date(`${date}T${time}`).toISOString();
      if (editingId) {
        await updateEvent.mutateAsync({
          id: editingId,
          title: title.trim(),
          start_time: startTime,
          assigned_to: assignee === "both" ? null : assignee,
        });
        toast.success("Event updated");
      } else {
        await createEvent.mutateAsync({
          couple_id: dashboard.couple.id,
          title: title.trim(),
          start_time: startTime,
          assigned_to: assignee === "both" ? undefined : assignee,
        });
        toast.success("Event added");
      }
      resetForm();
    } catch (err) {
      toast.error(editingId ? "Failed to update event" : "Failed to add event");
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
    updateEvent,
    deleteEvent,
    dashboard,
    user,
    isAdding,
    setIsAdding: (val: boolean) => {
      if (!val) resetForm();
      else setIsAdding(true);
    },
    editingId,
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
    handleEdit,
    groupedEvents,
    sortedDays,
  };
}
