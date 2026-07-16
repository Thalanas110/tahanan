import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useCouple";
import { hasAnyRoom } from "@/context/activeRoomState";

export function useProtectedRouteLogic() {
  const { session, loading: authLoading } = useAuth();
  const { data: dashboard, isLoading: dashboardLoading, isError, error, refetch } = useDashboard(!!session);
  const [location] = useLocation();

  const isUncoupled = !hasAnyRoom(dashboard);

  return {
    session,
    authLoading,
    dashboardLoading,
    isError,
    error,
    refetch,
    location,
    isUncoupled,
  };
}
