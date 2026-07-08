import { useState } from "react";
import { useHealthNotes, useCreateHealthNote, useDeleteHealthNote } from "@/hooks/useHealthNotes";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useCouple";
import { toast } from "sonner";

export function useHealthLogic() {
  const { data: notes, isLoading } = useHealthNotes();
  const createNote = useCreateHealthNote();
  const deleteNote = useDeleteHealthNote();
  const { user } = useAuth();
  const { data: dashboard } = useDashboard();
  
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState([5]);
  const [details, setDetails] = useState("");
  const [visible, setVisible] = useState(false);

  const myProfile = dashboard?.members.find(m => m.user_id === user?.id)?.profiles;
  const partnerProfile = dashboard?.members.find(m => m.user_id !== user?.id)?.profiles;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dashboard?.couple?.id) return;

    try {
      await createNote.mutateAsync({
        couple_id: dashboard.couple.id,
        health_type: type.trim() || undefined,
        severity: severity[0],
        notes: details.trim() || undefined,
        visible_to_partner: visible,
      });
      toast.success("Health log added");
      setIsAdding(false);
      setType("");
      setSeverity([5]);
      setDetails("");
      setVisible(false);
    } catch (err) {
      toast.error("Failed to add health log");
    }
  }

  return {
    notes,
    isLoading,
    createNote,
    deleteNote,
    user,
    dashboard,
    isAdding,
    setIsAdding,
    type,
    setType,
    severity,
    setSeverity,
    details,
    setDetails,
    visible,
    setVisible,
    myProfile,
    partnerProfile,
    handleSubmit,
  };
}
