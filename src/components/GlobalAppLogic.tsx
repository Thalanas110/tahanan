import { GlobalEmergencyAlert } from "./GlobalEmergencyAlert";
import { useGlobalAppLogic } from "./logic/GlobalAppLogic";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function GlobalAppLogic() {
  const { user } = useGlobalAppLogic();
  usePushNotifications();

  // If not authenticated, we don't need to show emergency alerts
  if (!user) return null;

  return <GlobalEmergencyAlert />;
}
