import { GlobalEmergencyAlert } from "./GlobalEmergencyAlert";
import { MonthsaryMessageDialog } from "./MonthsaryMessageDialog";
import { useGlobalAppLogic } from "./logic/GlobalAppLogic";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNetworkSync } from "@/hooks/useNetworkSync";

export function GlobalAppLogic() {
  const { user } = useGlobalAppLogic();
  usePushNotifications();
  useNetworkSync();

  // If not authenticated, we don't need to show emergency alerts
  if (!user) return null;

  return (
    <>
      <GlobalEmergencyAlert />
      <MonthsaryMessageDialog />
    </>
  );
}
