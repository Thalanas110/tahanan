import { useState } from "react";
import { useEmergencyEvents, useTriggerSos, useAcknowledgeSos, useResolveSos } from "@/hooks/useEmergency";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useCouple";
import { toast } from "sonner";

export function useEmergencyLogic() {
  const { data: events, isLoading } = useEmergencyEvents();
  const triggerSos = useTriggerSos();
  const acknowledgeSos = useAcknowledgeSos();
  const resolveSos = useResolveSos();
  const { user } = useAuth();
  const { data: dashboard } = useDashboard();
  
  const [isTriggering, setIsTriggering] = useState(false);
  const [message, setMessage] = useState("");
  const [locationNote, setLocationNote] = useState("");

  const activeEvent = events?.find(e => e.status !== "resolved");
  const pastEvents = events?.filter(e => e.status === "resolved") || [];

  const partnerProfile = dashboard?.members.find(m => m.user_id !== user?.id)?.profiles;

  async function handleTrigger(e: React.FormEvent) {
    e.preventDefault();
    try {
      await triggerSos.mutateAsync({
        message: message.trim() || undefined,
        locationNote: locationNote.trim() || undefined,
      });
      toast.success("SOS Alert Sent!", {
        description: "An email has been dispatched to your partner — ask them to check their inbox.",
        duration: 6000,
      });
      setIsTriggering(false);
      setMessage("");
      setLocationNote("");
    } catch (err) {
      toast.error("Failed to send SOS");
    }
  }

  return {
    events,
    isLoading,
    triggerSos,
    acknowledgeSos,
    resolveSos,
    user,
    dashboard,
    isTriggering,
    setIsTriggering,
    message,
    setMessage,
    locationNote,
    setLocationNote,
    activeEvent,
    pastEvents,
    partnerProfile,
    handleTrigger,
  };
}
