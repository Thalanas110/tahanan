import { useDashboardLogic, getEnergyLabel } from "./logic/dashboard";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, isToday } from "date-fns";
import { Heart, Calendar as CalendarIcon, AlertCircle, ArrowRight, Battery, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const {
    dashboard,
    user,
    myProfile,
    partnerProfile,
    myCheckin,
    partnerCheckin,
    todaysEvents,
    activeEmergency,
  } = useDashboardLogic();

  if (!dashboard || !dashboard.couple) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
          Welcome home, {myProfile?.display_name}.
        </h1>
        <p className="text-muted-foreground text-lg">
          {format(new Date(), "EEEE, MMMM do")}
        </p>
      </header>

      {activeEmergency && (
        <Card className="border-destructive bg-destructive/10 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-destructive font-bold">
              <AlertCircle className="w-6 h-6 animate-pulse" />
              <CardTitle className="text-xl">Active SOS</CardTitle>
            </div>
            <CardDescription className="text-destructive/80 text-base font-medium">
              Triggered by {activeEmergency.triggered_by === user?.id ? "you" : partnerProfile?.display_name || "partner"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeEmergency.message && (
              <p className="text-foreground font-medium">"{activeEmergency.message}"</p>
            )}
            <Button asChild variant="destructive" className="w-full sm:w-auto">
              <Link href="/emergency">View details & respond</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Check-ins Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-semibold">Today's Check-ins</h2>
            <Link href="/check-ins" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              View history <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid gap-4">
            {/* My Checkin */}
            <Card className="bg-card shadow-sm border-border overflow-hidden">
              <div className="bg-primary/5 px-4 py-3 border-b border-border/50 flex justify-between items-center">
                <span className="font-medium text-primary">You</span>
                {!myCheckin || !isToday(new Date(myCheckin.created_at)) ? (
                  <Button asChild size="sm" variant="outline" className="h-8">
                    <Link href="/check-ins">Log check-in</Link>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Logged today</span>
                )}
              </div>
              <CardContent className="p-4">
                {myCheckin && isToday(new Date(myCheckin.created_at)) ? (
                  <div className="space-y-3">
                    <div className="flex gap-4 items-center">
                      <div className="capitalize font-medium text-lg text-foreground">
                        {myCheckin.mood || "No mood set"}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Battery className="w-4 h-4" /> {getEnergyLabel(myCheckin.energy_level)}
                      </div>
                    </div>
                    {myCheckin.note && (
                      <p className="text-sm text-foreground/80 italic border-l-2 border-primary/30 pl-3">
                        "{myCheckin.note}"
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">You haven't checked in yet today.</p>
                )}
              </CardContent>
            </Card>

            {/* Partner Checkin */}
            {partnerProfile && (
              <Card className="bg-card shadow-sm border-border overflow-hidden">
                <div className="bg-secondary/10 px-4 py-3 border-b border-border/50 flex justify-between items-center">
                  <span className="font-medium text-secondary-foreground">{partnerProfile.display_name}</span>
                  {partnerCheckin && isToday(new Date(partnerCheckin.created_at)) ? (
                    <span className="text-xs text-muted-foreground">Logged today</span>
                  ) : null}
                </div>
                <CardContent className="p-4">
                  {partnerCheckin && isToday(new Date(partnerCheckin.created_at)) ? (
                    <div className="space-y-3">
                      <div className="flex gap-4 items-center">
                        <div className="capitalize font-medium text-lg text-foreground">
                          {partnerCheckin.mood || "No mood set"}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Battery className="w-4 h-4" /> {getEnergyLabel(partnerCheckin.energy_level)}
                        </div>
                      </div>
                      {partnerCheckin.note && !partnerCheckin.is_private && (
                        <p className="text-sm text-foreground/80 italic border-l-2 border-secondary/40 pl-3">
                          "{partnerCheckin.note}"
                        </p>
                      )}
                      {partnerCheckin.is_private && (
                        <p className="text-sm text-muted-foreground italic">Note kept private</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{partnerProfile.display_name} hasn't checked in yet today.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right Column: Events & Quick Actions */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-semibold">Today's Schedule</h2>
              <Link href="/calendar" className="text-sm font-medium text-primary hover:underline">
                Full calendar
              </Link>
            </div>

            <Card>
              <CardContent className="p-0">
                {todaysEvents.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {todaysEvents.map(event => (
                      <li key={event.id} className="p-4 flex items-start gap-3">
                        <CalendarIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(event.start_time), "h:mm a")}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-6 text-center text-muted-foreground">
                    <p className="text-sm">Nothing scheduled for today.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link href="/love-notes">
              <Card className="hover-elevate cursor-pointer transition-all border-border hover:border-primary/50 h-full">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 h-full">
                  <Heart className="w-8 h-8 text-accent" />
                  <span className="font-medium">Love Notes</span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/health">
              <Card className="hover-elevate cursor-pointer transition-all border-border hover:border-primary/50 h-full">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 h-full">
                  <ShieldAlert className="w-8 h-8 text-secondary" />
                  <span className="font-medium">Health Logs</span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
