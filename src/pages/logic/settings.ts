import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard, useUpdateCouple, dashboardQueryKey } from "@/hooks/useCouple";
import { useQueryClient } from "@tanstack/react-query";

export function useSettingsLogic() {
  const { profile, signOut, updateDisplayName } = useAuth();
  const { data: dashboard } = useDashboard();
  const updateCouple = useUpdateCouple();
  const queryClient = useQueryClient();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  const [isEditingProfileName, setIsEditingProfileName] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [isSavingProfileName, setIsSavingProfileName] = useState(false);
  
  const couple = dashboard?.couple;
  const members = dashboard?.members || [];
  const partnerProfile = members.find(m => m.user_id !== profile?.id)?.profiles;

  const cofCouple = dashboard?.cofCouple;
  const cofMembers = dashboard?.cofMembers || [];
  const cofPartnerProfile = cofMembers.find(m => m.user_id !== profile?.id)?.profiles;

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

  const handleSaveProfileName = async () => {
    if (profile && newProfileName.trim() && newProfileName.trim() !== profile.display_name) {
      setIsSavingProfileName(true);
      try {
        await updateDisplayName(newProfileName.trim());
        await queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
        setIsEditingProfileName(false);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSavingProfileName(false);
      }
    } else {
      setIsEditingProfileName(false);
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
    isEditingProfileName,
    setIsEditingProfileName,
    newProfileName,
    setNewProfileName,
    isSavingProfileName,
    handleSaveProfileName,
    cofCouple,
    cofPartnerProfile,
  };
}
