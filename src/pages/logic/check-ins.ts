import { useState } from "react";
import { useCheckins, useCreateCheckin } from "@/hooks/useCheckins";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useDashboard } from "@/hooks/useCouple";

export function useCheckinsLogic() {
  const { data: checkins, isLoading } = useCheckins();
  const createCheckin = useCreateCheckin();
  const { user } = useAuth();
  const { data: dashboard } = useDashboard();
  
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState<number[]>([3]);
  const [note, setNote] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const myProfile = dashboard?.members.find(m => m.user_id === user?.id)?.profiles;
  const partnerProfile = dashboard?.members.find(m => m.user_id !== user?.id)?.profiles;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mood) {
      toast.error("Please select a mood");
      return;
    }
    if (!dashboard?.couple?.id) return;

    try {
      await createCheckin.mutateAsync({
        couple_id: dashboard.couple.id,
        mood,
        energy_level: energy[0],
        note: note.trim() || undefined,
        is_private: isPrivate,
      });
      toast.success("Check-in logged");
      setIsFormOpen(false);
      setMood("");
      setEnergy([3]);
      setNote("");
      setIsPrivate(false);
    } catch (err) {
      toast.error("Failed to log check-in");
    }
  }

  return {
    checkins,
    isLoading,
    createCheckin,
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
    setIsFormOpen,
    handleSubmit,
  };
}
