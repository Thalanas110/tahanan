import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { exportUserData, downloadAsJSON, downloadAsPDF } from "@/lib/exportData";

export function useAccountActionsLogic() {
  const { deactivateAccount, signOut } = useAuth();
  
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setResetMessage("Password must be at least 6 characters.");
      return;
    }
    setIsResetting(true);
    setResetMessage("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsResetting(false);
    
    if (error) {
      setResetMessage(error.message);
    } else {
      setResetMessage("Password updated successfully!");
      setTimeout(() => {
        setResetOpen(false);
        setNewPassword("");
        setResetMessage("");
      }, 2000);
    }
  };

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    try {
      await deactivateAccount();
    } catch (err) {
      console.error(err);
      setIsDeactivating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const data = await exportUserData();
      downloadAsJSON(data);
      downloadAsPDF(data);
      
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      
      await signOut();
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  return {
    resetOpen, setResetOpen,
    newPassword, setNewPassword,
    isResetting,
    resetMessage,
    deactivateOpen, setDeactivateOpen,
    isDeactivating,
    deleteOpen, setDeleteOpen,
    isDeleting,
    handleResetPassword,
    handleDeactivate,
    handleDelete
  };
}
