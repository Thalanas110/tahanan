import { useEffect, useRef, useState } from "react";
import { useEmergencyEvents, useAcknowledgeSos } from "@/hooks/useEmergency";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import EmergencyAlarm from "@/lib/EmergencyAlarm";
import {
  bindEmergencyAudio,
  runAfterStoppingEmergencyAlert,
  stopEmergencyAlertPlayback,
} from "@/lib/emergencyAlarmControl";

export function useGlobalEmergencyAlertLogic() {
  // Global alert monitors ALL couple emergency events (both rooms).
  // Pass null to bypass the coupleId filter and rely on RLS to scope results.
  const { data: events } = useEmergencyEvents(null);
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

  useEffect(() => bindEmergencyAudio(audioRef.current), []);

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
      void stopEmergencyAlertPlayback(() => EmergencyAlarm.stopAlarm());
    }
  }, [partnerActiveEvent]);

  async function handleAcknowledgePartnerSos(emergencyId: string) {
    await runAfterStoppingEmergencyAlert(
      () => stopEmergencyAlertPlayback(() => EmergencyAlarm.stopAlarm()),
      () => acknowledgeSos.mutate(emergencyId, {
        onSuccess: () => {
          setLocation("/emergency");
        },
      }),
    );
  }

  return {
    partnerActiveEvent,
    myAcknowledgedEvent,
    acknowledgeSos,
    setLocation,
    audioRef,
    handleAcknowledgePartnerSos,
    setDismissedAcks,
  };
}
