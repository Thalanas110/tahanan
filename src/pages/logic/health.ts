import { useState } from "react";
import { useHealthNotes, useCreateHealthNote, useDeleteHealthNote, useUpdateHealthNote } from "@/hooks/useHealthNotes";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useCouple";
import { toast } from "sonner";
import { useActiveRoom } from "@/context/ActiveRoomContext";
import { useRoomMembers } from "@/hooks/useRoomMembers";
import { getMyMember, getPartnerMember } from "@/lib/roomParticipants";

export function useHealthLogic() {
  const { activeRoomId, activeRoomType } = useActiveRoom();
  const { data: notes, isLoading } = useHealthNotes(activeRoomId, activeRoomType);
  const createNote = useCreateHealthNote();
  const updateNote = useUpdateHealthNote();
  const deleteNote = useDeleteHealthNote();
  const { user } = useAuth();
  const { data: dashboard } = useDashboard();
  const { data: roomMembers = [] } = useRoomMembers(activeRoomId, activeRoomType);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState([5]);
  const [details, setDetails] = useState("");
  const [visible, setVisible] = useState(false);

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setType("");
    setSeverity([5]);
    setDetails("");
    setVisible(false);
  };

  function handleEdit(note: any) {
    setEditingId(note.id);
    setType(note.health_type || "");
    setSeverity([note.severity || 5]);
    setDetails(note.notes || "");
    setVisible(note.visible_to_partner || false);
    setIsAdding(true);
  }

  const myProfile = getMyMember(roomMembers, user?.id)?.profiles ?? null;
  const partnerProfile = getPartnerMember(roomMembers, user?.id)?.profiles ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRoomId) return;

    try {
      if (editingId) {
        await updateNote.mutateAsync({
          id: editingId,
          health_type: type.trim() || undefined,
          severity: severity[0],
          notes: details.trim() || undefined,
          visible_to_partner: visible,
        });
        toast.success("Health log updated");
      } else {
        await createNote.mutateAsync({
          roomId: activeRoomId!,
          roomType: activeRoomType,
          health_type: type.trim() || undefined,
          severity: severity[0],
          notes: details.trim() || undefined,
          visible_to_partner: visible,
        });
        toast.success("Health log added");
      }
      resetForm();
    } catch (err) {
      toast.error(editingId ? "Failed to update health log" : "Failed to add health log");
    }
  }

  return {
    notes,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    user,
    dashboard,
    isAdding,
    setIsAdding: (val: boolean) => {
      if (!val) resetForm();
      else setIsAdding(true);
    },
    editingId,
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
    handleEdit,
  };
}
