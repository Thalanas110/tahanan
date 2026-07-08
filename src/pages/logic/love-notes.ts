import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useCouple";
import { useLoveNotes, useCreateLoveNote, useToggleFavoriteLoveNote, useDeleteLoveNote } from "@/hooks/useLoveNotes";
import { toast } from "sonner";

export function useLoveNotesLogic() {
  const { data: notes, isLoading } = useLoveNotes();
  const createNote = useCreateLoveNote();
  const toggleFavorite = useToggleFavoriteLoveNote();
  const deleteNote = useDeleteLoveNote();
  const { user } = useAuth();
  const { data: dashboard } = useDashboard();
  
  const [isWriting, setIsWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [openWhen, setOpenWhen] = useState("");

  const partnerId = dashboard?.members.find(m => m.user_id !== user?.id)?.user_id;
  const partnerName = dashboard?.members.find(m => m.user_id !== user?.id)?.profiles?.display_name || "Partner";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !dashboard?.couple?.id) return;

    try {
      await createNote.mutateAsync({
        couple_id: dashboard.couple.id,
        recipient_id: partnerId,
        title: title.trim() || undefined,
        body: body.trim(),
        open_when: openWhen.trim() || undefined,
      });
      toast.success("Note sent");
      setIsWriting(false);
      setTitle("");
      setBody("");
      setOpenWhen("");
    } catch (err) {
      toast.error("Failed to send note");
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
    toggleFavorite,
    deleteNote,
    user,
    isWriting,
    setIsWriting,
    title,
    setTitle,
    body,
    setBody,
    openWhen,
    setOpenWhen,
    partnerName,
    handleSubmit,
    sortedNotes,
  };
}
