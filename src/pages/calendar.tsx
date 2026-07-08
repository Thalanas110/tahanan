import { useState } from "react";
import { useCalendarEvents, useCreateEvent, useDeleteEvent } from "@/hooks/useCalendar";
import { useDashboard } from "@/hooks/useCouple";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function CalendarPage() {
  const { data: events, isLoading } = useCalendarEvents();
  const createEvent = useCreateEvent();
  const deleteEvent = useDeleteEvent();
  const { data: dashboard } = useDashboard();
  const { user } = useAuth();
  
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("12:00");
  const [assignee, setAssignee] = useState("both");

  const myProfile = dashboard?.members.find(m => m.user_id === user?.id)?.profiles;
  const partnerProfile = dashboard?.members.find(m => m.user_id !== user?.id)?.profiles;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !dashboard?.couple?.id) return;

    try {
      const startTime = new Date(`${date}T${time}`).toISOString();
      await createEvent.mutateAsync({
        couple_id: dashboard.couple.id,
        title: title.trim(),
        start_time: startTime,
        assigned_to: assignee === "both" ? undefined : assignee,
      });
      toast.success("Event added");
      setIsAdding(false);
      setTitle("");
    } catch (err) {
      toast.error("Failed to add event");
    }
  }

  // Group events by day
  const groupedEvents = (events || []).reduce((acc: Record<string, any[]>, event) => {
    const day = format(new Date(event.start_time), "yyyy-MM-dd");
    if (!acc[day]) acc[day] = [];
    acc[day].push(event);
    return acc;
  }, {});

  const sortedDays = Object.keys(groupedEvents).sort();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground">Shared events and dates.</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Event
          </Button>
        )}
      </header>

      {isAdding && (
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Event Title</Label>
                <Input 
                  placeholder="e.g., Dinner Date, Doctor Appt" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input 
                    type="time" 
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Who's involved?</Label>
                <Select value={assignee} onValueChange={setAssignee}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both of us</SelectItem>
                    {myProfile && <SelectItem value={myProfile.id}>Just Me ({myProfile.display_name})</SelectItem>}
                    {partnerProfile && <SelectItem value={partnerProfile.id}>Just {partnerProfile.display_name}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createEvent.isPending}>
                  Save Event
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {sortedDays.length === 0 && !isLoading ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
            <CalendarIcon className="w-10 h-10 opacity-20" />
            <p>Your calendar is clear. Plan a date!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {sortedDays.map(dayStr => {
            const dateObj = new Date(dayStr);
            const isTodayDate = isSameDay(dateObj, new Date());
            
            return (
              <div key={dayStr} className="space-y-3">
                <h2 className="text-lg font-serif font-bold text-primary border-b border-border/50 pb-2">
                  {isTodayDate ? "Today" : format(dateObj, "EEEE, MMMM do")}
                </h2>
                <div className="grid gap-3">
                  {groupedEvents[dayStr].map(event => {
                    const assigneeName = dashboard?.members.find(m => m.user_id === event.assigned_to)?.profiles?.display_name;
                    
                    return (
                      <Card key={event.id} className={`overflow-hidden ${isTodayDate ? 'border-primary/30' : ''}`}>
                        <CardContent className="p-0 flex items-stretch">
                          <div className="w-2 bg-primary/20"></div>
                          <div className="p-4 flex-1 flex justify-between items-center gap-4">
                            <div>
                              <h3 className="font-medium text-foreground">{event.title}</h3>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(event.start_time), "h:mm a")}
                                </span>
                                {assigneeName && (
                                  <span className="bg-secondary/10 text-secondary-foreground px-2 py-0.5 rounded text-xs font-medium">
                                    {assigneeName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => {
                              if(confirm("Delete this event?")) deleteEvent.mutate(event.id);
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
