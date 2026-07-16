import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard, useCoupleRecord, useUpdateCouple, dashboardQueryKey } from "@/hooks/useCouple";
import { useQueryClient } from "@tanstack/react-query";
import { useRoomMembers } from "@/hooks/useRoomMembers";
import { useMyRooms } from "@/hooks/useMyRooms";
import { resolveCurrentCouple } from "@/lib/coupleSource";

export function useSettingsLogic() {
  const { profile, signOut, updateDisplayName } = useAuth();
  const { data: dashboard } = useDashboard();
  const { data: rooms } = useMyRooms();
  const { data: directCouple } = useCoupleRecord(
    dashboard?.couple?.id ?? rooms?.partnerRoom?.id ?? null,
  );
  const updateCouple = useUpdateCouple();
  const queryClient = useQueryClient();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isEditingRelationshipStartDate, setIsEditingRelationshipStartDate] = useState(false);
  const [relationshipStartDateDraft, setRelationshipStartDateDraft] = useState("");

  const [isEditingProfileName, setIsEditingProfileName] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [isSavingProfileName, setIsSavingProfileName] = useState(false);
  
  const couple = resolveCurrentCouple({
    dashboardCouple: dashboard?.couple,
    directCouple,
  });
  const members = dashboard?.members || [];
  const partnerProfile = members.find(m => m.user_id !== profile?.id)?.profiles;

  const cofCouple = dashboard?.cofCouple;
  const { data: cofMembers = [] } = useRoomMembers(cofCouple?.id ?? null, "cof");
  const cofPartnerProfile = cofMembers.find(m => m.user_id !== profile?.id)?.profiles;

  useEffect(() => {
    setRelationshipStartDateDraft(couple?.relationship_start_date ?? "");
  }, [couple?.relationship_start_date]);

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

  const handleSaveRelationshipStartDate = () => {
    if (
      !couple ||
      !relationshipStartDateDraft ||
      relationshipStartDateDraft === couple.relationship_start_date
    ) {
      setIsEditingRelationshipStartDate(false);
      return;
    }

    updateCouple.mutate(
      {
        coupleId: couple.id,
        relationshipStartDate: relationshipStartDateDraft,
      },
      {
        onSuccess: () => {
          setIsEditingRelationshipStartDate(false);
        },
      },
    );
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
    isEditingRelationshipStartDate,
    setIsEditingRelationshipStartDate,
    relationshipStartDateDraft,
    setRelationshipStartDateDraft,
    handleSaveRelationshipStartDate,
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
