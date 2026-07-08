import { ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useCouple";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { data: dashboard, isLoading: dashboardLoading, isError, error, refetch } = useDashboard();
  const [location] = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Redirect to="/login" />;
  }

  // Dashboard query handles returning `couple: null` if not paired.
  if (dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // A failed request (network error, function error) is NOT the same as
  // "not paired yet" -- don't bounce the user to onboarding when the
  // dashboard call simply failed to load.
  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-foreground font-medium">
          We couldn't load your space right now.
        </p>
        <p className="text-muted-foreground text-sm max-w-sm">
          {error instanceof Error ? error.message : "Please try again."}
        </p>
        <button
          onClick={() => refetch()}
          className="text-primary underline underline-offset-4"
        >
          Try again
        </button>
      </div>
    );
  }

  const isUncoupled = !dashboard?.couple;

  if (isUncoupled && location !== "/onboarding") {
    return <Redirect to="/onboarding" />;
  }

  if (!isUncoupled && location === "/onboarding") {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
