import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useDashboard } from "@/hooks/useCouple";
import { useEmergencyRealtime } from "@/hooks/useEmergency";
import {
  Home,
  Calendar,
  Heart,
  Stethoscope,
  CheckSquare,
  Settings,
  AlertTriangle,
  MoreHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Nav data ─────────────────────────────────────────────────────────────────
const PRIMARY_NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/check-ins", label: "Check-ins", icon: Heart },
  // Center slot is SOS (see below)
  { href: "/love-notes", label: "Notes", icon: Heart },
] as const;

const MORE_NAV = [
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/health", label: "Health", icon: Stethoscope },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

// ─── Mobile bottom nav ────────────────────────────────────────────────────────
function MobileNav({ location }: { location: string }) {
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = MORE_NAV.some((n) => n.href === location);

  return (
    <>
      {/* "More" sheet — slides up above the bar */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 48,
              background: "rgba(0,0,0,0.15)",
              border: "none",
              cursor: "default",
            }}
          />
          {/* Sheet */}
          <div
            style={{
              position: "fixed",
              bottom: "72px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 49,
              background: "hsl(40 33% 98%)",
              border: "1px solid hsl(24 15% 87%)",
              borderRadius: "20px",
              padding: "8px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px",
              boxShadow: "0 8px 32px rgba(60,30,10,0.18), 0 2px 8px rgba(60,30,10,0.08)",
              animation: "sheetUp 0.2s cubic-bezier(0.34,1.56,0.64,1) both",
              minWidth: "200px",
            }}
          >
            {MORE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl transition-colors min-w-[72px]",
                  location === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold">{item.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/90 backdrop-blur-xl pb-safe z-50">
        {/* keyframe injected once */}
        <style>{`
          @keyframes sheetUp {
            from { opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.95); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1);    }
          }
        `}</style>

        <div className="flex items-end justify-around px-2 pt-1 pb-2">
          {/* Left two items */}
          {PRIMARY_NAV.slice(0, 2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 p-2 rounded-xl min-w-[3.2rem] transition-colors",
                location === item.href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "w-[22px] h-[22px]",
                  location === item.href && "fill-primary/20",
                )}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}

          {/* ── Center SOS button ─────────────────────────────────────────── */}
          <Link
            href="/emergency"
            aria-label="SOS Emergency"
            style={{
              position: "relative",
              top: "-14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              textDecoration: "none",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background:
                  location === "/emergency"
                    ? "hsl(0 75% 42%)"
                    : "hsl(0 72% 51%)",
                boxShadow:
                  "0 4px 20px rgba(200,30,30,0.45), 0 0 0 4px hsl(40 33% 96%)",
                transition: "background 0.15s, box-shadow 0.15s",
              }}
            >
              <AlertTriangle
                style={{ width: "26px", height: "26px", color: "white" }}
              />
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "hsl(0 72% 45%)",
                letterSpacing: "0.5px",
              }}
            >
              SOS
            </span>
          </Link>

          {/* Right two items */}
          {PRIMARY_NAV.slice(2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 p-2 rounded-xl min-w-[3.2rem] transition-colors",
                location === item.href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "w-[22px] h-[22px]",
                  location === item.href && "fill-primary/20",
                )}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}

          {/* More button */}
          <button
            type="button"
            aria-label={moreOpen ? "Close more menu" : "Open more menu"}
            onClick={() => setMoreOpen((o) => !o)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 p-2 rounded-xl min-w-[3.2rem] transition-colors border-none bg-transparent cursor-pointer",
              moreOpen || isMoreActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {moreOpen ? (
              <X className="w-[22px] h-[22px]" />
            ) : (
              <MoreHorizontal className="w-[22px] h-[22px]" />
            )}
            <span className="text-[10px] font-medium">
              {isMoreActive && !moreOpen ? "More •" : "More"}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────
export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: dashboard } = useDashboard();

  useEmergencyRealtime(dashboard?.couple?.id);

  const allNavItems = [...PRIMARY_NAV, ...MORE_NAV];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-6">
          <h1 className="text-2xl font-serif text-primary font-bold tracking-tight">
            Tahanan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Our shared space</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {allNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
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
                : "bg-destructive/10 text-destructive hover:bg-destructive/20",
            )}
          >
            <AlertTriangle className="w-4 h-4" />
            SOS Emergency
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0 overflow-auto">
        <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav location={location} />
    </div>
  );
}
