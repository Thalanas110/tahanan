import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateCouple, useJoinCouple, useDashboard } from "@/hooks/useCouple";
import { useCreateCof, useJoinCof } from "@/hooks/useCof";
import { useMyRooms } from "@/hooks/useMyRooms";
import { resolveAvailableRooms } from "@/context/activeRoomState";
import { toast } from "sonner";

export function useOnboardingLogic() {
  const [, setLocation] = useLocation();
  const createCouple = useCreateCouple();
  const joinCouple = useJoinCouple();
  const createCof = useCreateCof();
  const joinCof = useJoinCof();

  // Determine if the user already has a 'partner' couple — if so, the only
  // new room they may create is a 'cof' one.
  const { data: dashboard } = useDashboard();
  const { data: directRooms } = useMyRooms();
  const availableRooms = resolveAvailableRooms({
    dashboard,
    directRooms,
  });
  const hasPartnerCouple = !!availableRooms.partnerRoom;
  const hasCofCouple = !!availableRooms.cofRoom;

  const [coupleName, setCoupleName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!coupleName.trim()) return;

    // When the user already has a partner couple, always create a COF room.
    const type = hasPartnerCouple ? "cof" : "partner";

    try {
      if (hasPartnerCouple) {
        const res = await createCof.mutateAsync({ name: coupleName });
        setCreatedInviteCode(res.cof.invite_code);
        toast.success("COF space created! Share your code.");
      } else {
        const res = await createCouple.mutateAsync({ name: coupleName });
        setCreatedInviteCode(res.couple.invite_code);
        toast.success("Space created! Share your code.");
      }
    } catch (err: any) {
      const msg: string = err?.message ?? "";
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
      if (hasPartnerCouple) {
        await joinCof.mutateAsync(inviteCode.toUpperCase());
      } else {
        await joinCouple.mutateAsync(inviteCode.toUpperCase());
      }
      toast.success("Joined successfully!");
      setLocation("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to join. Check the code and try again.");
    }
  }

  return {
    createPending: createCouple.isPending || createCof.isPending,
    joinPending: joinCouple.isPending || joinCof.isPending,
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
