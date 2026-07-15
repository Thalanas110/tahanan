import { useState } from "react";
import { useCheckins, useCreateCheckin, useUpdateCheckin } from "@/hooks/useCheckins";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useDashboard } from "@/hooks/useCouple";
import { useActiveRoom } from "@/context/ActiveRoomContext";

export function useCheckinsLogic() {
  const { data: checkins, isLoading } = useCheckins(useActiveRoom().activeRoomId);
  const createCheckin = useCreateCheckin();
  const updateCheckin = useUpdateCheckin();
  const { user } = useAuth();
  const { data: dashboard } = useDashboard();
  const { activeRoomId } = useActiveRoom();
  
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState<number[]>([3]);
  const [note, setNote] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setMood("");
    setEnergy([3]);
    setNote("");
    setIsPrivate(false);
  };

  function handleEdit(checkin: any) {
    setEditingId(checkin.id);
    setMood(checkin.mood || "");
    setEnergy([checkin.energy_level || 3]);
    setNote(checkin.note || "");
    setIsPrivate(checkin.is_private || false);
    setIsFormOpen(true);
  }

  const myProfile = dashboard?.members.find(m => m.user_id === user?.id)?.profiles;
  const partnerProfile = dashboard?.members.find(m => m.user_id !== user?.id)?.profiles;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mood) {
      toast.error("Please select a mood");
      return;
    }
    if (!activeRoomId) return;

    try {
      if (editingId) {
        await updateCheckin.mutateAsync({
          id: editingId,
          mood,
          energy_level: energy[0],
          note: note.trim() || undefined,
          is_private: isPrivate,
        });
        toast.success("Check-in updated");
      } else {
        await createCheckin.mutateAsync({
          couple_id: activeRoomId!,
          mood,
          energy_level: energy[0],
          note: note.trim() || undefined,
          is_private: isPrivate,
        });
        toast.success("Check-in logged");
      }
      resetForm();
    } catch (err) {
      toast.error(editingId ? "Failed to update check-in" : "Failed to log check-in");
    }
  }

  return {
    checkins,
    isLoading,
    createCheckin,
    updateCheckin,
    user,
    myProfile,
    partnerProfile,
    mood,
    setMood,
    energy,
    setEnergy,
    note,
    setNote,
    isPrivate,
    setIsPrivate,
    isFormOpen,
    setIsFormOpen: (val: boolean) => {
      if (!val) resetForm();
      else setIsFormOpen(true);
    },
    editingId,
    handleSubmit,
    handleEdit,
  };
}
