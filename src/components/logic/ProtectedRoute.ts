import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useCouple";
import { hasAnyRoom, resolveAvailableRooms } from "@/context/activeRoomState";
import { useMyRooms } from "@/hooks/useMyRooms";

export function useProtectedRouteLogic() {
  const { session, loading: authLoading } = useAuth();
  const { data: dashboard, isLoading: dashboardLoading, isError, error, refetch } = useDashboard(!!session);
  const { data: directRooms, isLoading: directRoomsLoading } = useMyRooms(!!session);
  const [location] = useLocation();

  const availableRooms = resolveAvailableRooms({
    dashboard,
    directRooms,
  });
  const isUncoupled =
    !dashboardLoading &&
    !directRoomsLoading &&
    !hasAnyRoom({
      couple: availableRooms.partnerRoom ? { id: availableRooms.partnerRoom.id } : null,
      cofCouple: availableRooms.cofRoom ? { id: availableRooms.cofRoom.id } : null,
    });

  return {
    session,
    authLoading,
    dashboardLoading: dashboardLoading || directRoomsLoading,
    isError,
    error,
    refetch,
    location,
    isUncoupled,
  };
}
