import { GlobalEmergencyAlert } from "./GlobalEmergencyAlert";
import { useGlobalAppLogic } from "./logic/GlobalAppLogic";

export function GlobalAppLogic() {
  const { user } = useGlobalAppLogic();

  // If not authenticated, we don't need to show emergency alerts
  if (!user) return null;

  return <GlobalEmergencyAlert />;
}
