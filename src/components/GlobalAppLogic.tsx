import { useDashboard } from "@/hooks/useCouple";
import { useEmergencyRealtime } from "@/hooks/useEmergency";
import { GlobalEmergencyAlert } from "./GlobalEmergencyAlert";
import { useAuth } from "@/hooks/useAuth";

export function GlobalAppLogic() {
  const { user } = useAuth();
  
  // Only try to fetch dashboard if user is authenticated
  const { data: dashboard } = useDashboard(!!user);

  useEmergencyRealtime(dashboard?.couple?.id);

  // If not authenticated, we don't need to show emergency alerts
  if (!user) return null;

  return <GlobalEmergencyAlert />;
}
