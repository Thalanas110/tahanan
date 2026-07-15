import { useState, useEffect } from "react";
import { useEmergencyEvents, useTriggerSos, useAcknowledgeSos, useResolveSos } from "@/hooks/useEmergency";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useCouple";
import { toast } from "sonner";
import { useActiveRoom } from "@/context/ActiveRoomContext";

export function useEmergencyLogic() {
  const { activeRoomId } = useActiveRoom();
  const { data: events, isLoading } = useEmergencyEvents(activeRoomId);
  const triggerSos = useTriggerSos();
  const acknowledgeSos = useAcknowledgeSos();
  const resolveSos = useResolveSos();
  const { user } = useAuth();
  const { data: dashboard } = useDashboard();
  
  const [isTriggering, setIsTriggering] = useState(false);
  const [message, setMessage] = useState("");
  const [locationNote, setLocationNote] = useState("");

  const [responderLat, setResponderLat] = useState<number>();
  const [responderLon, setResponderLon] = useState<number>();

  const activeEvent = events?.find(e => e.status !== "resolved");
  const pastEvents = events?.filter(e => e.status === "resolved") || [];

  const partnerProfile = dashboard?.members.find(m => m.user_id !== user?.id)?.profiles;

  // Fetch responder's location if there's an active event from the partner
  useEffect(() => {
    if (activeEvent && activeEvent.triggered_by !== user?.id && "geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setResponderLat(pos.coords.latitude);
          setResponderLon(pos.coords.longitude);
        },
        (err) => console.warn("Responder location error:", err),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [activeEvent, user?.id]);

  async function handleTrigger(e: React.FormEvent) {
    e.preventDefault();
    try {
      let lat: number | undefined;
      let lon: number | undefined;

      // Try to get location silently
      if ("geolocation" in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 0,
              enableHighAccuracy: true,
            });
          });
          lat = position.coords.latitude;
          lon = position.coords.longitude;
        } catch (error) {
          console.warn("Location fetch failed, proceeding without location:", error);
          // Silently fail, location remains undefined
        }
      }

      await triggerSos.mutateAsync({
        message: message.trim() || undefined,
        locationNote: locationNote.trim() || undefined,
        latitude: lat,
        longitude: lon,
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
    responderLat,
    responderLon,
  };
}
