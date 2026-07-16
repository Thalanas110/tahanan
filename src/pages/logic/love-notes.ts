import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLoveNotes, useCreateLoveNote, useToggleFavoriteLoveNote, useDeleteLoveNote, useUpdateLoveNote } from "@/hooks/useLoveNotes";
import { toast } from "sonner";
import { useActiveRoom } from "@/context/ActiveRoomContext";
import { useRoomMembers } from "@/hooks/useRoomMembers";
import { getPartnerMember } from "@/lib/roomParticipants";
import { buildCreateLoveNoteInput } from "@/lib/loveNoteDraft";

export function useLoveNotesLogic() {
  const { activeRoomId, activeRoomType } = useActiveRoom();
  const { data: notes, isLoading } = useLoveNotes(activeRoomId, activeRoomType);
  const { data: roomMembers = [] } = useRoomMembers(activeRoomId, activeRoomType);
  const createNote = useCreateLoveNote();
  const updateNote = useUpdateLoveNote();
  const toggleFavorite = useToggleFavoriteLoveNote();
  const deleteNote = useDeleteLoveNote();
  const { user } = useAuth();
  
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

  const partnerMember = getPartnerMember(roomMembers, user?.id);
  const partnerId = partnerMember?.user_id;
  const partnerName = partnerMember?.profiles?.display_name || "Partner";

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
        await createNote.mutateAsync(
          buildCreateLoveNoteInput({
            roomId: activeRoomId,
            roomType: activeRoomType,
            recipientId: partnerId,
            title: title.trim() || undefined,
            body: body.trim(),
            openWhen: openWhen.trim() || undefined,
          }),
        );
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
    partnerId,
    partnerName,
    handleSubmit,
    handleEdit,
    sortedNotes,
  };
}
