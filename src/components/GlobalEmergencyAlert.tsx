import { useEffect, useRef } from "react";
import { useEmergencyEvents, useAcknowledgeSos } from "@/hooks/useEmergency";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export function GlobalEmergencyAlert() {
  const { data: events } = useEmergencyEvents();
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const acknowledgeSos = useAcknowledgeSos();
  const audioRef = useRef<HTMLAudioElement>(null);

  // An active event is one that is 'active' and NOT triggered by the current user
  const partnerActiveEvent = !authLoading && user ? events?.find(
    (e) => e.status === "active" && e.triggered_by !== user.id
  ) : undefined;

  // Handle playing audio
  useEffect(() => {
    if (partnerActiveEvent && audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.warn("Autoplay prevented:", err);
      });
    } else if (!partnerActiveEvent && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [partnerActiveEvent]);

  if (!partnerActiveEvent) {
    // Keep audio element mounted but hidden so we can reuse it
    return <audio ref={audioRef} loop src="/Military Alarm - Sound FX Copyright Free.mp3" className="hidden" />;
  }

  return (
    <>
      <audio ref={audioRef} loop src="/Military Alarm - Sound FX Copyright Free.mp3" className="hidden" />
      <div className="fixed inset-0 z-[100] bg-destructive/95 backdrop-blur-md flex flex-col items-center justify-center text-destructive-foreground p-6 animate-in fade-in zoom-in-95 duration-300">
        <AlertTriangle className="w-24 h-24 mb-6 animate-pulse text-white" />
        <h1 className="text-4xl md:text-6xl font-black mb-4 text-center tracking-tight text-white uppercase drop-shadow-lg">
          SOS Alert
        </h1>
        <p className="text-xl md:text-2xl font-medium mb-8 text-center max-w-md text-white/90">
          Your partner has triggered an emergency SOS!
        </p>

        {partnerActiveEvent.message && (
          <div className="bg-black/20 p-6 rounded-xl mb-8 max-w-md w-full text-center backdrop-blur-sm border border-white/10 shadow-xl">
             <span className="text-xs font-bold uppercase tracking-wider text-white/70 mb-2 block">Message</span>
             <p className="font-semibold text-xl text-white">"{partnerActiveEvent.message}"</p>
          </div>
        )}

        <div className="flex flex-col gap-4 w-full max-w-sm">
          <Button 
            size="lg" 
            className="w-full text-xl h-16 font-bold bg-white text-destructive hover:bg-white/90 shadow-2xl transition-transform hover:scale-105 active:scale-95"
            onClick={() => {
              acknowledgeSos.mutate(partnerActiveEvent.id, {
                onSuccess: () => setLocation("/emergency")
              });
            }}
            disabled={acknowledgeSos.isPending}
          >
            {acknowledgeSos.isPending ? (
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            ) : null}
            {acknowledgeSos.isPending ? "Acknowledging..." : "Acknowledge SOS"}
          </Button>
        </div>
      </div>
    </>
  );
}
