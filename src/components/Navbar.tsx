import { Link } from "wouter";
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
  StickyNote,
  LogOut,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavbarLogic, useMobileNavLogic } from "./logic/Navbar";
import { useActiveRoom } from "@/context/ActiveRoomContext";
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

// ─── Nav data ─────────────────────────────────────────────────────────────────
const PRIMARY_NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/check-ins", label: "Check-ins", icon: Heart },
  // Center slot is SOS (see below)
  { href: "/love-notes", label: "Notes", icon: StickyNote },
] as const;

const MORE_NAV = [
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/health", label: "Health", icon: Stethoscope },
  { href: "/trusted-contacts", label: "Trusted Contacts", icon: Users, cofOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

// ─── Room switcher pill ───────────────────────────────────────────────────────
function RoomSwitcher() {
  const { activeRoomType, hasCof, switchRoom } = useActiveRoom();
  if (!hasCof) return null;
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg text-xs font-semibold">
      <button
        type="button"
        onClick={() => switchRoom("partner")}
        className={cn(
          "flex-1 py-1.5 px-2 rounded-md transition-colors",
          activeRoomType === "partner"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        🏠 Partner
      </button>
      <button
        type="button"
        onClick={() => switchRoom("cof")}
        className={cn(
          "flex-1 py-1.5 px-2 rounded-md transition-colors",
          activeRoomType === "cof"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        👥 COF
      </button>
    </div>
  );
}

// ─── Mobile bottom nav ────────────────────────────────────────────────────────
function MobileNav({ location }: { location: string }) {
  const { moreOpen, setMoreOpen, signOut } = useMobileNavLogic(location);
  const { hasCof, activeRoomType } = useActiveRoom();

  const visibleMore = MORE_NAV.filter((n) => !('cofOnly' in n && n.cofOnly && !hasCof));
  const isMoreActive = visibleMore.some((n) => n.href === location);

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
              bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
              left: "auto",
              right: "12px",
              transform: "none",
              zIndex: 49,
              background: "hsl(40 33% 98%)",
              border: "1px solid hsl(24 15% 87%)",
              borderRadius: "20px",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              boxShadow: "0 8px 32px rgba(60,30,10,0.18), 0 2px 8px rgba(60,30,10,0.08)",
              animation: "sheetUpRight 0.2s cubic-bezier(0.34,1.56,0.64,1) both",
              transformOrigin: "bottom right",
              minWidth: "140px",
            }}
          >
          {/* Room switcher */}
            <div className="px-2 pb-2">
              <RoomSwitcher />
            </div>
            {visibleMore.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-2 px-4 py-3.5 rounded-xl transition-colors w-full",
                  location === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span className="text-sm font-medium">{item.label}</span>
                <item.icon className="w-5 h-5" />
              </Link>
            ))}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-between gap-2 px-4 py-3.5 rounded-xl transition-colors w-full text-destructive hover:bg-destructive/10 border-none bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-medium">Sign Out</span>
                  <LogOut className="w-5 h-5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign Out</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to sign out?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setMoreOpen(false)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { setMoreOpen(false); signOut(); }}>Sign Out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}

      {/* Bottom bar */}
      <nav
        data-tutorial-id="tutorial-navbar"
        className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/90 backdrop-blur-xl z-50"
        style={{
          // Fill the background colour behind the Android gesture bar
          // and push the nav items above it with the safe-area inset.
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* keyframe injected once */}
        <style>{`
          @keyframes sheetUp {
            from { opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.95); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1);    }
          }
          @keyframes sheetUpRight {
            from { opacity: 0; transform: translateY(12px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0)     scale(1);    }
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
            data-tutorial-id="tutorial-sos"
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

export function Navbar() {
  const { location, signOut, upcomingMilestone } = useNavbarLogic();
  const { hasCof } = useActiveRoom();
  const visibleMore = MORE_NAV.filter((n) => !('cofOnly' in n && n.cofOnly && !hasCof));
  const allNavItems = [...PRIMARY_NAV, ...visibleMore];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 h-screen sticky top-0 flex-shrink-0 flex-col border-r border-border bg-card overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-serif text-primary font-bold tracking-tight flex items-center gap-2">
            <img src="/tahanan logo.png" alt="Tahanan Logo" className="w-8 h-8 object-contain" />
            Tahanan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Our shared space</p>
        </div>

        {/* Room switcher pill — only visible when user has a COF room */}
        <div className="px-4 pb-2">
          <RoomSwitcher />
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors bg-destructive/10 text-destructive hover:bg-destructive/20 border-none cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign Out</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to sign out?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => signOut()}>Sign Out</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <MobileNav location={location} />
    </>
  );
}
