import { GlobalEmergencyAlert } from "./GlobalEmergencyAlert";
import { MonthsaryMessageDialog } from "./MonthsaryMessageDialog";
import { useGlobalAppLogic } from "./logic/GlobalAppLogic";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useMonthsaryDayNotifications } from "@/hooks/useMonthsaryDayNotifications";
import { useNetworkSync } from "@/hooks/useNetworkSync";

export function GlobalAppLogic() {
  const { user, dashboard } = useGlobalAppLogic();
  usePushNotifications();
  useNetworkSync();
  useMonthsaryDayNotifications({
    userId: user?.id,
    couple: dashboard?.couple,
    members: dashboard?.members,
  });

  // If not authenticated, we don't need to show emergency alerts
  if (!user) return null;

  return (
    <>
      <GlobalEmergencyAlert />
      <MonthsaryMessageDialog />
    </>
  );
}
