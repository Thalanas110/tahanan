import { useCalendarLogic } from "./logic/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Clock, MapPin, Pencil } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Calendar } from "@/components/ui/calendar";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface DatePickerProps {
  date: string;
  setDate: (date: string) => void;
}

function DatePicker({ date, setDate }: DatePickerProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const getLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const formattedDate = date ? format(getLocalDate(date), "PPP") : "Select date";

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "w-full justify-start text-left font-normal h-9 border-input bg-transparent px-3 py-1 hover:bg-muted/20 active:bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring shadow-sm",
        !date && "text-muted-foreground"
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
      {formattedDate}
    </Button>
  );

  const calendarComponent = (
    <Calendar
      mode="single"
      selected={date ? getLocalDate(date) : undefined}
      onSelect={(newDate) => {
        if (newDate) {
          setDate(format(newDate, "yyyy-MM-dd"));
          setIsOpen(false);
        }
      }}
      initialFocus
    />
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          {triggerButton}
        </DrawerTrigger>
        <DrawerContent className="border-border bg-background pb-6">
          <div className="mx-auto w-full max-w-sm flex flex-col items-center">
            <div className="w-full text-center py-4 border-b border-border/50">
              <h3 className="font-serif font-bold text-lg text-foreground">Select Date</h3>
            </div>
            <div className="p-4 w-full flex justify-center">
              {calendarComponent}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-border bg-popover shadow-md" align="start">
        {calendarComponent}
      </PopoverContent>
    </Popover>
  );
}

interface TimePickerProps {
  time: string;
  setTime: (time: string) => void;
}

function TimePicker({ time, setTime }: TimePickerProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const [h24Str, mStr] = (time || "12:00").split(":");
  let h24 = parseInt(h24Str, 10);
  if (isNaN(h24)) h24 = 12;
  
  const ampm = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  
  const currentHourStr = h12.toString().padStart(2, "0");
  const currentMinuteStr = mStr || "00";

  const formattedTime = `${currentHourStr}:${currentMinuteStr} ${ampm}`;

  const handleTimeChange = (newHour: string, newMinute: string, newAmpm: string) => {
    let h = parseInt(newHour, 10);
    if (newAmpm === "PM" && h < 12) h += 12;
    if (newAmpm === "AM" && h === 12) h = 0;
    setTime(`${h.toString().padStart(2, "0")}:${newMinute}`);
  };

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "w-full justify-start text-left font-normal h-9 border-input bg-transparent px-3 py-1 hover:bg-muted/20 active:bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring shadow-sm",
        !time && "text-muted-foreground"
      )}
    >
      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
      {formattedTime}
    </Button>
  );

  const timeComponent = (
    <div className="flex items-start justify-center gap-2 p-4">
      <div className="flex flex-col items-center">
        <span className="text-[10px] text-muted-foreground mb-1 font-bold uppercase tracking-wider">Hour</span>
        <ScrollArea className="h-48 w-16 rounded-md border border-border/50 bg-background/50">
          <div className="flex flex-col p-1 gap-1">
            {Array.from({length: 12}).map((_, i) => {
              const val = (i + 1).toString().padStart(2, "0");
              return (
                <Button 
                  key={val} 
                  variant={currentHourStr === val ? "default" : "ghost"} 
                  size="sm"
                  className={cn("w-full h-8", currentHourStr === val ? "" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => handleTimeChange(val, currentMinuteStr, ampm)}
                >
                  {val}
                </Button>
              )
            })}
          </div>
        </ScrollArea>
      </div>
      
      <div className="flex flex-col items-center mt-7">
        <span className="text-lg font-bold text-muted-foreground/50">:</span>
      </div>

      <div className="flex flex-col items-center">
        <span className="text-[10px] text-muted-foreground mb-1 font-bold uppercase tracking-wider">Minute</span>
        <ScrollArea className="h-48 w-16 rounded-md border border-border/50 bg-background/50">
          <div className="flex flex-col p-1 gap-1">
            {Array.from({length: 12}).map((_, i) => {
              const val = (i * 5).toString().padStart(2, "0");
              return (
                <Button 
                  key={val} 
                  variant={currentMinuteStr === val ? "default" : "ghost"} 
                  size="sm"
                  className={cn("w-full h-8", currentMinuteStr === val ? "" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => handleTimeChange(currentHourStr, val, ampm)}
                >
                  {val}
                </Button>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="flex flex-col items-center ml-2">
        <span className="text-[10px] text-muted-foreground mb-1 font-bold uppercase tracking-wider">AM/PM</span>
        <div className="flex flex-col gap-2 h-48 justify-center">
          <Button 
            variant={ampm === "AM" ? "default" : "outline"} 
            size="sm"
            className={cn("w-14", ampm === "AM" ? "" : "text-muted-foreground")}
            onClick={() => handleTimeChange(currentHourStr, currentMinuteStr, "AM")}
          >
            AM
          </Button>
          <Button 
            variant={ampm === "PM" ? "default" : "outline"} 
            size="sm"
            className={cn("w-14", ampm === "PM" ? "" : "text-muted-foreground")}
            onClick={() => handleTimeChange(currentHourStr, currentMinuteStr, "PM")}
          >
            PM
          </Button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          {triggerButton}
        </DrawerTrigger>
        <DrawerContent className="border-border bg-background pb-6">
          <div className="mx-auto w-full max-w-sm flex flex-col items-center">
            <div className="w-full text-center py-4 border-b border-border/50">
              <h3 className="font-serif font-bold text-lg text-foreground">Select Time</h3>
            </div>
            {timeComponent}
            <div className="w-full px-8 mt-2">
               <Button className="w-full" onClick={() => setIsOpen(false)}>Done</Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-border bg-popover shadow-md" align="start">
        {timeComponent}
      </PopoverContent>
    </Popover>
  );
}

export default function CalendarPage() {
  const {
    events,
    isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    dashboard,
    isAdding,
    setIsAdding,
    editingId,
    title,
    setTitle,
    date,
    setDate,
    time,
    setTime,
    assignee,
    setAssignee,
    myProfile,
    partnerProfile,
    handleSubmit,
    handleEdit,
    groupedEvents,
    sortedDays,
  } = useCalendarLogic();

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
                  <DatePicker date={date} setDate={setDate} />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <TimePicker time={time} setTime={setTime} />
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
                <Button type="submit" disabled={createEvent.isPending || updateEvent?.isPending}>
                  {editingId ? "Update Event" : "Save Event"}
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
                            <div className="flex gap-1 items-center">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(event)} className="text-muted-foreground hover:text-primary">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Event</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this event? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteEvent.mutate(event.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
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
