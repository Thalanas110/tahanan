import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { ActiveRoomProvider } from "@/context/ActiveRoomContext";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ActiveRoomProvider>
      <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background w-full">
        <Navbar />

        {/* Main Content */}
        <main
          className="flex-1 flex flex-col min-w-0 overflow-auto md:pb-0"
          style={{
            // On mobile: leave room for the fixed bottom navbar (≈96px) PLUS
            // the Android gesture/navigation bar safe-area inset.
            // On desktop (md+) we reset to 0 via the md:pb-0 class above.
            paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </ActiveRoomProvider>
  );
}
