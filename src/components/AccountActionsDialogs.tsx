import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { exportUserData, downloadAsJSON, downloadAsPDF } from "@/lib/exportData";
import { AlertTriangle, Download } from "lucide-react";

export function AccountActionsDialogs() {
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
      // 1. Export Data
      const data = await exportUserData();
      downloadAsJSON(data);
      downloadAsPDF(data);
      
      // 2. Delete Account via RPC
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      
      // 3. Sign out
      await signOut();
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button variant="outline" className="w-full sm:w-auto" onClick={() => setResetOpen(true)}>
        Reset Password
      </Button>
      <Button 
        variant="outline" 
        className="w-full sm:w-auto text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setDeactivateOpen(true)}
      >
        Deactivate Account
      </Button>
      <Button variant="destructive" className="w-full sm:w-auto" onClick={() => setDeleteOpen(true)}>
        Delete Account
      </Button>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Enter a new password for your account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input 
              type="password" 
              placeholder="New password (min 6 chars)" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {resetMessage && (
              <p className={`text-sm ${resetMessage.includes('success') ? 'text-green-500' : 'text-destructive'}`}>
                {resetMessage}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={isResetting}>
              {isResetting ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Account Dialog */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Account</DialogTitle>
            <DialogDescription>
              This will hide your profile and log you out. Your data will be preserved. 
              You can reactivate your account anytime simply by logging back in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={isDeactivating}>
              {isDeactivating ? "Deactivating..." : "Yes, Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              Are you absolutely sure? This action cannot be undone.
              This will permanently delete your account and remove your data from our servers.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <p className="text-sm font-medium">Before deleting, we will automatically download your data:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside">
              <li>A JSON file with your raw data</li>
              <li>A PDF summary of your account</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="gap-2">
              <Download className="w-4 h-4" />
              {isDeleting ? "Deleting & Exporting..." : "Export & Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
