import type { ReactNode } from "react";
import { useDashboard } from "@/hooks/useCouple";
import { useEmergencyRealtime } from "@/hooks/useEmergency";
import { Navbar } from "./Navbar";

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: dashboard } = useDashboard();

  useEmergencyRealtime(dashboard?.couple?.id);

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background w-full">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0 overflow-auto">
        <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

