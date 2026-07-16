import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard, useCoupleRecord } from "@/hooks/useCouple";
import { useLoveNotes, useCreateLoveNote, useToggleFavoriteLoveNote, useDeleteLoveNote, useUpdateLoveNote } from "@/hooks/useLoveNotes";
import { useCreateMonthsaryMessage, useMonthsaryMessages, useUpdateMonthsaryMessage } from "@/hooks/useMonthsaryMessages";
import { toast } from "sonner";
import { useActiveRoom } from "@/context/ActiveRoomContext";
import { useRoomMembers } from "@/hooks/useRoomMembers";
import { getPartnerMember } from "@/lib/roomParticipants";
import { buildCreateLoveNoteInput } from "@/lib/loveNoteDraft";
import {
  buildMonthsaryMessageInput,
  findEditableMonthsaryMessage,
  getMonthsaryComposerTarget,
} from "@/lib/monthsaryMessageDraft";
import { getMonthsaryComposerBlocker } from "@/lib/monthsaryComposer";
import { resolveCurrentCouple } from "@/lib/coupleSource";

export function useLoveNotesLogic() {
  const { activeRoomId, activeRoomType } = useActiveRoom();
  const { data: dashboard } = useDashboard();
  const { data: directCouple } = useCoupleRecord(
    activeRoomType === "partner" ? activeRoomId : null,
  );
  const { data: notes, isLoading } = useLoveNotes(activeRoomId, activeRoomType);
  const { data: roomMembers = [] } = useRoomMembers(
    activeRoomId,
    activeRoomType,
  );
  const createNote = useCreateLoveNote();
  const updateNote = useUpdateLoveNote();
  const toggleFavorite = useToggleFavoriteLoveNote();
  const deleteNote = useDeleteLoveNote();
  const createMonthsaryMessage = useCreateMonthsaryMessage();
  const updateMonthsaryMessage = useUpdateMonthsaryMessage();
  const { user } = useAuth();
  
  const [isWriting, setIsWriting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [openWhen, setOpenWhen] = useState("");
  const [monthsaryTitle, setMonthsaryTitle] = useState("");
  const [monthsaryBody, setMonthsaryBody] = useState("");

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
  const currentCouple = resolveCurrentCouple({
    dashboardCouple: dashboard?.couple,
    directCouple,
  });
  const relationshipStartDate =
    activeRoomType === "partner" ? currentCouple?.relationship_start_date ?? null : null;
  const targetMonthsaryDate = getMonthsaryComposerTarget({
    roomType: activeRoomType,
    relationshipStartDate,
  });
  const monthsaryComposerBlocker = getMonthsaryComposerBlocker({
    roomType: activeRoomType,
    relationshipStartDate,
  });
  const { data: monthsaryMessages = [] } = useMonthsaryMessages(
    activeRoomType === "partner" ? activeRoomId : null,
    activeRoomType === "partner",
  );
  const editableMonthsaryMessage = findEditableMonthsaryMessage(
    monthsaryMessages,
    user?.id ?? null,
  );
  const effectiveTargetMonthsaryDate =
    editableMonthsaryMessage?.target_monthsary_date ?? targetMonthsaryDate;

  useEffect(() => {
    setMonthsaryTitle(editableMonthsaryMessage?.title ?? "");
    setMonthsaryBody(editableMonthsaryMessage?.body ?? "");
  }, [editableMonthsaryMessage?.id, editableMonthsaryMessage?.title, editableMonthsaryMessage?.body]);

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

  async function handleMonthsarySubmit(e: React.FormEvent) {
    e.preventDefault();

    if (monthsaryComposerBlocker) {
      toast.error(monthsaryComposerBlocker);
      return;
    }

    if (!monthsaryBody.trim()) {
      toast.error("Please write your monthsary message");
      return;
    }

    if (
      activeRoomType !== "partner" ||
      !activeRoomId ||
      !effectiveTargetMonthsaryDate
    ) {
      return;
    }

    const recipientIdForSave =
      partnerId ?? editableMonthsaryMessage?.recipient_id ?? null;

    const payload = buildMonthsaryMessageInput({
      coupleId: activeRoomId,
      recipientId: recipientIdForSave,
      title: monthsaryTitle,
      body: monthsaryBody,
      targetMonthsaryDate: effectiveTargetMonthsaryDate,
    });

    try {
      if (editableMonthsaryMessage) {
        await updateMonthsaryMessage.mutateAsync({
          id: editableMonthsaryMessage.id,
          recipient_id: payload.recipient_id,
          title: payload.title,
          body: payload.body,
        });
        toast.success("Monthsary message updated");
      } else {
        await createMonthsaryMessage.mutateAsync(payload);
        toast.success(
          recipientIdForSave
            ? "Monthsary message saved"
            : "Monthsary message saved for your future partner",
        );
      }
    } catch (error) {
      toast.error(editableMonthsaryMessage ? "Failed to update monthsary message" : "Failed to save monthsary message");
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
    activeRoomType,
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
    relationshipStartDate,
    targetMonthsaryDate: effectiveTargetMonthsaryDate,
    monthsaryComposerBlocker,
    monthsaryTitle,
    setMonthsaryTitle,
    monthsaryBody,
    setMonthsaryBody,
    editableMonthsaryMessage,
    createMonthsaryMessage,
    updateMonthsaryMessage,
    handleSubmit,
    handleMonthsarySubmit,
    handleEdit,
    sortedNotes,
  };
}
