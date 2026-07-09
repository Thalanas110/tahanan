import { useCheckinsLogic } from "./logic/check-ins";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { format } from "date-fns";
import { Loader2, Lock, Unlock, Pencil } from "lucide-react";

const MOODS = [
  { value: "great", label: "Great" },
  { value: "good", label: "Good" },
  { value: "okay", label: "Okay" },
  { value: "down", label: "Down" },
  { value: "struggling", label: "Struggling" },
];

export default function Checkins() {
  const {
    checkins,
    isLoading,
    createCheckin,
    updateCheckin,
    user,
    myProfile,
    partnerProfile,
    mood,
    setMood,
    energy,
    setEnergy,
    note,
    setNote,
    isPrivate,
    setIsPrivate,
    isFormOpen,
    setIsFormOpen,
    editingId,
    handleSubmit,
    handleEdit,
  } = useCheckinsLogic();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Daily Check-ins</h1>
          <p className="text-muted-foreground">Share how you're doing with each other.</p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => setIsFormOpen(true)}>Log today's check-in</Button>
        )}
      </header>

      {isFormOpen && (
        <Card className="border-primary/20 bg-card shadow-md">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="text-xl">How are you feeling?</CardTitle>
            <CardDescription>Take a moment to reflect. Be honest.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <Label>Overall Mood</Label>
                <ToggleGroup
                  type="single"
                  value={mood}
                  onValueChange={(v) => { if (v) setMood(v); }}
                  className="justify-start flex-wrap gap-2"
                >
                  {MOODS.map(m => (
                    <ToggleGroupItem
                      key={m.value}
                      value={m.value}
                      className="rounded-full px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      {m.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Energy Level</Label>
                  <span className="text-sm font-medium text-primary">{energy[0]} / 5</span>
                </div>
                <Slider
                  value={energy}
                  onValueChange={setEnergy}
                  max={5}
                  min={1}
                  step={1}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Exhausted</span>
                  <span>Fully Charged</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Add a note (optional)</Label>
                <Textarea
                  placeholder="What's on your mind?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="resize-none min-h-[100px]"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-border pt-4 gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    id="private-mode"
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                  />
                  <Label htmlFor="private-mode" className="flex items-center gap-2 cursor-pointer">
                    {isPrivate ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Unlock className="w-4 h-4 text-muted-foreground" />}
                    Keep note private
                  </Label>
                </div>
                <div className="flex justify-end gap-2 w-full sm:w-auto">
                  <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createCheckin.isPending || updateCheckin?.isPending}>
                    {(createCheckin.isPending || updateCheckin?.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {editingId ? "Update Check-in" : "Save Check-in"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 mt-8">
        <h2 className="text-xl font-serif font-semibold">History</h2>
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !checkins?.length ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              No check-ins yet. Start by logging one today.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {checkins.map(checkin => {
              const isMine = checkin.user_id === user?.id;
              const profile = isMine ? myProfile : partnerProfile;
              const name = profile?.display_name || "Unknown";
              const showNote = checkin.note && (isMine || !checkin.is_private);

              return (
                <Card key={checkin.id} className="overflow-hidden border-border/50">
                  <div className={`px-4 py-2 border-b flex justify-between items-center ${isMine ? 'bg-primary/5 border-primary/10' : 'bg-secondary/5 border-secondary/10'}`}>
                    <span className="font-medium text-sm">
                      {isMine ? "You" : name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(checkin.created_at), "MMM d, h:mm a")}
                      </span>
                      {isMine && (
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(checkin)} className="h-6 w-6 text-muted-foreground hover:text-primary">
                          <Pencil className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex gap-4 items-center">
                      <span className="capitalize font-medium text-lg">{checkin.mood || "No mood"}</span>
                      <span className="text-sm text-muted-foreground">Energy: {checkin.energy_level}/5</span>
                    </div>
                    {showNote && (
                      <p className="text-sm text-foreground/80 italic border-l-2 pl-3 border-border">
                        "{checkin.note}"
                      </p>
                    )}
                    {checkin.is_private && isMine && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Lock className="w-3 h-3" /> Note is private
                      </div>
                    )}
                    {checkin.is_private && !isMine && checkin.note && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Lock className="w-3 h-3" /> Note hidden
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
