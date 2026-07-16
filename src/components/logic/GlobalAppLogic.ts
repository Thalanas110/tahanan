import { useDashboard } from "@/hooks/useCouple";
import { useEmergencyRealtime } from "@/hooks/useEmergency";
import { useAuth } from "@/hooks/useAuth";

export function useGlobalAppLogic() {
  const { user } = useAuth();
  
  // Only try to fetch dashboard if user is authenticated
  const { data: dashboard } = useDashboard(!!user);

  useEmergencyRealtime(dashboard?.couple?.id, "partner");
  useEmergencyRealtime(dashboard?.cofCouple?.id, "cof");

  return { user, dashboard };
}
