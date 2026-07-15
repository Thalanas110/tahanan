import { useEffect, useRef, useState } from "react";
import { useEmergencyEvents, useAcknowledgeSos } from "@/hooks/useEmergency";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import EmergencyAlarm from "@/lib/EmergencyAlarm";

export function useGlobalEmergencyAlertLogic() {
  const { data: events } = useEmergencyEvents();
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const acknowledgeSos = useAcknowledgeSos();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [dismissedAcks, setDismissedAcks] = useState<Set<string>>(new Set());

  // An active event is one that is 'active' and NOT triggered by the current user
  const partnerActiveEvent = !authLoading && user ? events?.find(
    (e) => e.status === "active" && e.triggered_by !== user.id
  ) : undefined;

  // An acknowledged event triggered by the current user
  const myAcknowledgedEvent = !authLoading && user ? events?.find(
    (e) => e.status === "acknowledged" && e.triggered_by === user.id && !dismissedAcks.has(e.id)
  ) : undefined;

  // Handle playing audio
  useEffect(() => {
    if (partnerActiveEvent) {
      if (audioRef.current) {
        audioRef.current.play().catch((err) => {
          console.warn("Autoplay prevented:", err);
        });
      }
      EmergencyAlarm.startAlarm().catch(console.error);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      EmergencyAlarm.stopAlarm().catch(console.error);
    }
  }, [partnerActiveEvent]);

  return {
    partnerActiveEvent,
    myAcknowledgedEvent,
    acknowledgeSos,
    setLocation,
    audioRef,
    setDismissedAcks,
  };
}
