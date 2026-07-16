import { useState } from "react";
import { useTrustedContacts, useCreateTrustedContact, useDeleteTrustedContact } from "@/hooks/useTrustedContacts";
import { useActiveRoom } from "@/context/ActiveRoomContext";
import { toast } from "sonner";

export function useTrustedContactsLogic() {
  const { activeRoomId, activeRoomType } = useActiveRoom();
  const { data: contacts, isLoading } = useTrustedContacts(activeRoomId, activeRoomType);
  const createContact = useCreateTrustedContact();
  const deleteContact = useDeleteTrustedContact();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setIsAdding(false);
    setName("");
    setRelationship("");
    setPhone("");
    setEmail("");
    setNotes("");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !activeRoomId) return;

    try {
      await createContact.mutateAsync({
        roomId: activeRoomId,
        roomType: activeRoomType,
        name: name.trim(),
        relationship: relationship.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Contact added");
      resetForm();
    } catch {
      toast.error("Failed to add contact");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteContact.mutateAsync(id);
      toast.success("Contact removed");
    } catch {
      toast.error("Failed to remove contact");
    }
  }

  return {
    contacts,
    isLoading,
    activeRoomId,
    createContact,
    deleteContact,
    isAdding,
    setIsAdding: (val: boolean) => {
      if (!val) resetForm();
      else setIsAdding(true);
    },
    name, setName,
    relationship, setRelationship,
    phone, setPhone,
    email, setEmail,
    notes, setNotes,
    handleSubmit,
    handleDelete,
  };
}
