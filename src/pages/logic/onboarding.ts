import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateCouple, useJoinCouple } from "@/hooks/useCouple";
import { toast } from "sonner";

export function useOnboardingLogic() {
  const [, setLocation] = useLocation();
  const createCouple = useCreateCouple();
  const joinCouple = useJoinCouple();

  const [coupleName, setCoupleName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!coupleName.trim()) return;
    try {
      const res = await createCouple.mutateAsync(coupleName);
      setCreatedInviteCode(res.couple.invite_code);
      toast.success("Space created! Share your code with your partner.");
    } catch (err: any) {
      // If we're already coupled (stale cache / double-submit), just go home.
      if (err?.message?.toLowerCase().includes("already part of a couple")) {
        toast.info("You already have a space — taking you there.");
        setLocation("/");
        return;
      }
      toast.error(err.message || "Failed to create space");
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim() || inviteCode.length !== 6) {
      toast.error("Please enter a valid 6-character code");
      return;
    }
    try {
      await joinCouple.mutateAsync(inviteCode.toUpperCase());
      toast.success("Joined successfully!");
      setLocation("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to join. Check the code and try again.");
    }
  }

  return {
    createCouple,
    joinCouple,
    coupleName,
    setCoupleName,
    inviteCode,
    setInviteCode,
    createdInviteCode,
    handleCreate,
    handleJoin,
    setLocation,
  };
}
