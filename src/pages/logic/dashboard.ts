import { useDashboard } from "@/hooks/useCouple";
import { useAuth } from "@/hooks/useAuth";
import { useCalendarEvents, useUpcomingMilestone } from "@/hooks/useCalendar";
import { useActiveRoom } from "@/context/ActiveRoomContext";
import { useCheckins } from "@/hooks/useCheckins";
import { useEmergencyEvents } from "@/hooks/useEmergency";
import { useRoomMembers } from "@/hooks/useRoomMembers";
import { getMyMember, getPartnerMember } from "@/lib/roomParticipants";
import { pickActiveEmergency, pickLatestCheckins, pickTodaysEvents } from "@/lib/roomDashboard";

export function getEnergyLabel(level: number | null) {
  if (!level) return "Unknown";
  if (level >= 4) return "High energy";
  if (level === 3) return "Okay energy";
  return "Low energy";
}

export function useDashboardLogic() {
  const { data: dashboard } = useDashboard();
  const { user } = useAuth();
  const { activeRoomId, activeRoomName, activeRoomType } = useActiveRoom();
  const { data: roomMembers = [] } = useRoomMembers(activeRoomId, activeRoomType);
  const { data: checkins = [] } = useCheckins(activeRoomId, activeRoomType);
  const { data: events = [] } = useCalendarEvents(activeRoomId, activeRoomType);
  const { data: emergencies = [] } = useEmergencyEvents(activeRoomId, activeRoomType);

  const myProfile = getMyMember(roomMembers, user?.id)?.profiles ?? null;
  const partnerProfile = getPartnerMember(roomMembers, user?.id)?.profiles ?? null;

  const { myLatestCheckin, partnerLatestCheckin } = pickLatestCheckins(checkins, user?.id);
  const todaysEvents = pickTodaysEvents(events);
  const activeEmergency = pickActiveEmergency(emergencies);
  const upcomingAnniversary = useUpcomingMilestone(activeRoomId, activeRoomType);

  return {
    dashboard,
    activeRoomId,
    activeRoomName,
    activeRoomType,
    user,
    myProfile,
    partnerProfile,
    myCheckin: myLatestCheckin,
    partnerCheckin: partnerLatestCheckin,
    todaysEvents,
    activeEmergency,
    upcomingAnniversary,
  };
}
