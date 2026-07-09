import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useUpcomingMilestone } from "@/hooks/useCalendar";

export function useMobileNavLogic(location: string) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { signOut } = useAuth();
  
  return { moreOpen, setMoreOpen, signOut };
}

export function useNavbarLogic() {
  const [location] = useLocation();
  const { signOut } = useAuth();
  const upcomingMilestone = useUpcomingMilestone();

  return { location, signOut, upcomingMilestone };
}
