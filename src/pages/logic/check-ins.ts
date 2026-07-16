import { useState } from "react";
import { useCheckins, useCreateCheckin, useUpdateCheckin } from "@/hooks/useCheckins";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useActiveRoom } from "@/context/ActiveRoomContext";
import { useRoomMembers } from "@/hooks/useRoomMembers";
import { getMyMember, getPartnerMember } from "@/lib/roomParticipants";

export function useCheckinsLogic() {
  const { activeRoomId, activeRoomType } = useActiveRoom();
  const { user } = useAuth();

  const { data: checkins, isLoading } = useCheckins(activeRoomId, activeRoomType);
  const { data: roomMembers = [] } = useRoomMembers(activeRoomId, activeRoomType);
  const createCheckin = useCreateCheckin();
  const updateCheckin = useUpdateCheckin();
  
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState<number[]>([3]);
  const [note, setNote] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showHealth, setShowHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState("");

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setMood("");
    setEnergy([3]);
    setNote("");
    setIsPrivate(false);
    setShowHealth(false);
    setHealthStatus("");
  };

  function handleEdit(checkin: any) {
    setEditingId(checkin.id);
    setMood(checkin.mood || "");
    setEnergy([checkin.energy_level || 3]);
    setNote(checkin.note || "");
    setIsPrivate(checkin.is_private || false);
    setIsFormOpen(true);
  }

  const myProfile = getMyMember(roomMembers, user?.id)?.profiles ?? null;
  const partnerProfile = getPartnerMember(roomMembers, user?.id)?.profiles ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomId || !mood) {
      toast.error("Please select a mood");
      return;
    }

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
          roomId: activeRoomId,
          roomType: activeRoomType,
          mood,
          energy_level: energy[0],
          health_status: showHealth ? healthStatus : undefined,
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
