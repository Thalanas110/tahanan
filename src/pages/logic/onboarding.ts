import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateCouple, useJoinCouple, useDashboard } from "@/hooks/useCouple";
import { toast } from "sonner";

export function useOnboardingLogic() {
  const [, setLocation] = useLocation();
  const createCouple = useCreateCouple();
  const joinCouple = useJoinCouple();

  // Determine if the user already has a 'partner' couple — if so, the only
  // new room they may create is a 'cof' one.
  const { data: dashboard } = useDashboard();
  const hasPartnerCouple = !!dashboard?.couple;
  const hasCofCouple = !!dashboard?.cofCouple;

  const [coupleName, setCoupleName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!coupleName.trim()) return;

    // When the user already has a partner couple, always create a COF room.
    const type = hasPartnerCouple ? "cof" : "partner";

    try {
      const res = await createCouple.mutateAsync({ name: coupleName, type });
      setCreatedInviteCode(res.couple.invite_code);
      const label = type === "cof" ? "COF space" : "space";
      toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} created! Share your code.`);
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      // Bounce home if stale cache / double-submit for the same type.
      if (msg.toLowerCase().includes("already part of")) {
        toast.info("You already have that space — taking you home.");
        setLocation("/dashboard");
        return;
      }
      toast.error(msg || "Failed to create space");
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
      setLocation("/dashboard");
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
    /** true when the user already has a partner couple and is creating a COF room */
    isCofMode: hasPartnerCouple,
    /** true when the user already has a COF couple too (fully paired in both types) */
    hasCofCouple,
  };
}
