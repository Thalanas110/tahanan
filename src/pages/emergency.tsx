import { useEmergencyLogic } from "./logic/emergency";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { AlertTriangle, MapPin, Loader2, CheckCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Emergency() {
  const {
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
  } = useEmergencyLogic();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {activeEvent?.status === "active" && (
        <audio autoPlay loop src="/Military Alarm - Sound FX Copyright Free.mp3" />
      )}
      <header className="space-y-2 text-center md:text-left">
        <h1 className="text-3xl font-serif font-bold text-destructive flex items-center justify-center md:justify-start gap-2">
          <AlertTriangle className="w-8 h-8" /> Emergency
        </h1>
        <p className="text-muted-foreground">For when you need them right now.</p>
      </header>

      {/* Active Alert Banner */}
      {activeEvent && (
        <Card className="border-destructive shadow-lg animate-in zoom-in-95 duration-300">
          <CardHeader className="bg-destructive text-destructive-foreground pb-4 rounded-t-lg">
            <CardTitle className="text-2xl flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
              ACTIVE SOS
            </CardTitle>
            <CardDescription className="text-destructive-foreground/90 font-medium">
              Triggered by {activeEvent.triggered_by === user?.id ? "You" : partnerProfile?.display_name || "Partner"}
              {" at "} {format(new Date(activeEvent.created_at), "h:mm a")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              {activeEvent.message && (
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Message</span>
                  <p className="text-lg font-medium">"{activeEvent.message}"</p>
                </div>
              )}
              {activeEvent.location_note && (
                <div className="flex items-start gap-2 text-muted-foreground bg-muted/20 p-3 rounded-lg">
                  <MapPin className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{activeEvent.location_note}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
              {activeEvent.triggered_by !== user?.id && activeEvent.status === "active" && (
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                  size="lg"
                  onClick={() => acknowledgeSos.mutate(activeEvent.id)}
                  disabled={acknowledgeSos.isPending}
                >
                  {acknowledgeSos.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Clock className="w-5 h-5 mr-2" />}
                  I'm on my way (Acknowledge)
                </Button>
              )}

              {(activeEvent.triggered_by === user?.id || activeEvent.status === "acknowledged") && (
                <Button
                  className="flex-1"
                  variant="outline"
                  size="lg"
                  onClick={() => resolveSos.mutate(activeEvent.id)}
                  disabled={resolveSos.isPending}
                >
                  {resolveSos.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                  Resolve & Close Alert
                </Button>
              )}
            </div>

            {activeEvent.status === "acknowledged" && (
              <div className="text-center text-sm font-medium text-amber-600 bg-amber-50 p-2 rounded">
                Acknowledged by {activeEvent.acknowledged_by === user?.id ? "you" : partnerProfile?.display_name}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trigger Button State */}
      {!activeEvent && !isTriggering && (
        <div className="flex justify-center py-12">
          <button
            onClick={() => setIsTriggering(true)}
            className="w-48 h-48 rounded-full bg-destructive text-destructive-foreground shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 flex flex-col items-center justify-center gap-2 border-8 border-destructive/20 ring-4 ring-destructive/10"
          >
            <AlertTriangle className="w-12 h-12" />
            <span className="font-bold text-2xl tracking-wide">SOS</span>
          </button>
        </div>
      )}

      {/* Trigger Form */}
      {!activeEvent && isTriggering && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Trigger SOS</CardTitle>
            <CardDescription>Send an immediate alert to your partner's device.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrigger} className="space-y-4">
              <div className="space-y-2">
                <Label>What's happening? (optional)</Label>
                <Textarea
                  placeholder="Need you to call me, feeling unsafe, etc."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Where are you? (optional)</Label>
                <Input
                  placeholder="Corner of 5th and Main, or at home"
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsTriggering(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" className="flex-1" disabled={triggerSos.isPending}>
                  {triggerSos.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  SEND ALERT NOW
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {pastEvents.length > 0 && (
        <div className="space-y-4 opacity-70">
          <h2 className="text-xl font-serif font-semibold text-muted-foreground">Past Alerts</h2>
          <div className="space-y-2">
            {pastEvents.slice(0, 5).map(event => (
              <Card key={event.id} className="bg-muted/30">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">
                      Alert from {event.triggered_by === user?.id ? "You" : partnerProfile?.display_name || "Partner"}
                    </p>
                    {event.message && <p className="text-xs text-muted-foreground mt-1">"{event.message}"</p>}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Resolved on {format(new Date(event.created_at), "MMM d, h:mm a")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
