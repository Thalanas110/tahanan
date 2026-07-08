import { useDashboard } from "@/hooks/useCouple";
import { useAuth } from "@/hooks/useAuth";

export function getEnergyLabel(level: number | null) {
  if (!level) return "Unknown";
  if (level >= 4) return "High energy";
  if (level === 3) return "Okay energy";
  return "Low energy";
}

export function useDashboardLogic() {
  const { data: dashboard } = useDashboard();
  const { user } = useAuth();

  const myProfile = dashboard?.members.find(m => m.user_id === user?.id)?.profiles;
  const partnerProfile = dashboard?.members.find(m => m.user_id !== user?.id)?.profiles;

  const myCheckin = dashboard?.myLatestCheckin;
  const partnerCheckin = dashboard?.partnerLatestCheckin;
  const todaysEvents = dashboard?.todaysEvents || [];
  const activeEmergency = dashboard?.activeEmergency;

  return {
    dashboard,
    user,
    myProfile,
    partnerProfile,
    myCheckin,
    partnerCheckin,
    todaysEvents,
    activeEmergency,
  };
}
