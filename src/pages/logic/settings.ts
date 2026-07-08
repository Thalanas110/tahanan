import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard, useUpdateCouple } from "@/hooks/useCouple";

export function useSettingsLogic() {
  const { profile, signOut } = useAuth();
  const { data: dashboard } = useDashboard();
  const updateCouple = useUpdateCouple();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  
  const couple = dashboard?.couple;
  const members = dashboard?.members || [];
  const partnerProfile = members.find(m => m.user_id !== profile?.id)?.profiles;

  const handleSaveName = () => {
    if (couple && newName.trim() && newName.trim() !== couple.name) {
      updateCouple.mutate(
        { coupleId: couple.id, name: newName.trim() },
        {
          onSuccess: () => {
            setIsEditingName(false);
          }
        }
      );
    } else {
      setIsEditingName(false);
    }
  };

  return {
    profile,
    signOut,
    couple,
    partnerProfile,
    isEditingName,
    setIsEditingName,
    newName,
    setNewName,
    handleSaveName,
    updateCouple,
  };
}
