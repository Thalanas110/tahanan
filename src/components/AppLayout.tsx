import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useCouple";
import { useEmergencyRealtime } from "@/hooks/useEmergency";
import { Home, Calendar, Heart, Stethoscope, CheckSquare, Settings, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: dashboard } = useDashboard();
  
  // Realtime listener for emergency events for this couple
  useEmergencyRealtime(dashboard?.couple?.id);

  const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/check-ins", label: "Check-ins", icon: Heart },
    { href: "/love-notes", label: "Love Notes", icon: Heart },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/health", label: "Health", icon: Stethoscope },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-6">
          <h1 className="text-2xl font-serif text-primary font-bold tracking-tight">Tahanan</h1>
          <p className="text-sm text-muted-foreground mt-1">Our shared space</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location === item.href 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 space-y-2">
          <Link
            href="/emergency"
            className={cn(
              "flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors",
              location === "/emergency"
                ? "bg-destructive text-destructive-foreground"
                : "bg-destructive/10 text-destructive hover:bg-destructive/20"
            )}
          >
            <AlertTriangle className="w-4 h-4" />
            SOS Emergency
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 overflow-auto">
        <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/80 backdrop-blur-xl pb-safe z-50">
        <div className="flex justify-around p-2">
          {navItems.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg min-w-[4rem] transition-colors",
                location === item.href 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 mb-1", location === item.href && "fill-primary/20")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
          <Link
            href="/emergency"
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-lg min-w-[4rem] transition-colors",
              location === "/emergency" ? "text-destructive" : "text-destructive/80"
            )}
          >
            <AlertTriangle className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">SOS</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
