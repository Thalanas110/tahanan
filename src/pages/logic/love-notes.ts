import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useCouple";
import { useLoveNotes, useCreateLoveNote, useToggleFavoriteLoveNote, useDeleteLoveNote, useUpdateLoveNote } from "@/hooks/useLoveNotes";
import { toast } from "sonner";
import { useActiveRoom } from "@/context/ActiveRoomContext";

export function useLoveNotesLogic() {
  const { activeRoomId } = useActiveRoom();
  const { data: notes, isLoading } = useLoveNotes(activeRoomId);
  const createNote = useCreateLoveNote();
  const updateNote = useUpdateLoveNote();
  const toggleFavorite = useToggleFavoriteLoveNote();
  const deleteNote = useDeleteLoveNote();
  const { user } = useAuth();
  const { data: dashboard } = useDashboard();
  
  const [isWriting, setIsWriting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [openWhen, setOpenWhen] = useState("");

  const resetForm = () => {
    setIsWriting(false);
    setEditingId(null);
    setTitle("");
    setBody("");
    setOpenWhen("");
  };

  function handleEdit(note: any) {
    setEditingId(note.id);
    setTitle(note.title || "");
    setBody(note.body || "");
    setOpenWhen(note.open_when || "");
    setIsWriting(true);
  }

  const partnerId = dashboard?.members.find(m => m.user_id !== user?.id)?.user_id;
  const partnerName = dashboard?.members.find(m => m.user_id !== user?.id)?.profiles?.display_name || "Partner";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !activeRoomId) return;

    try {
      if (editingId) {
        await updateNote.mutateAsync({
          id: editingId,
          title: title.trim() || undefined,
          body: body.trim(),
          open_when: openWhen.trim() || undefined,
        });
        toast.success("Note updated");
      } else {
        await createNote.mutateAsync({
          couple_id: activeRoomId!,
          recipient_id: partnerId,
          title: title.trim() || undefined,
          body: body.trim(),
          open_when: openWhen.trim() || undefined,
        });
        toast.success("Note sent");
      }
      resetForm();
    } catch (err) {
      toast.error(editingId ? "Failed to update note" : "Failed to send note");
    }
  }

  const sortedNotes = notes ? [...notes].sort((a, b) => {
    if (a.is_favorite === b.is_favorite) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return a.is_favorite ? -1 : 1;
  }) : [];

  return {
    isLoading,
    createNote,
    updateNote,
    toggleFavorite,
    deleteNote,
    user,
    isWriting,
    setIsWriting: (val: boolean) => {
      if (!val) resetForm();
      else setIsWriting(true);
    },
    editingId,
    title,
    setTitle,
    body,
    setBody,
    openWhen,
    setOpenWhen,
    partnerName,
    handleSubmit,
    handleEdit,
    sortedNotes,
  };
}
