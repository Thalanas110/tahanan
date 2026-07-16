import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { useActiveRoom } from "@/context/ActiveRoomContext";

function AppLayoutFrame({ children }: { children: ReactNode }) {
  const { activeRoomName, activeRoomType } = useActiveRoom();

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background w-full">
      <Navbar />

      <main
        className="flex-1 flex flex-col min-w-0 overflow-auto md:pb-0"
        style={{
          // On mobile: leave room for the fixed bottom navbar plus the safe-area inset.
          // On desktop (md+) we reset to 0 via the md:pb-0 class above.
          paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8">
          <div className="mb-4">
            <p className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {activeRoomType === "cof" ? "COF Space" : "Partner Space"}: {activeRoomName ?? "Shared Space"}
            </p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return <AppLayoutFrame>{children}</AppLayoutFrame>;
}
