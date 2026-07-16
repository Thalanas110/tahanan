import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useDashboard } from "@/hooks/useCouple";
import type { CoupleType } from "@/types/database";
import {
  ACTIVE_ROOM_SESSION_KEY,
  readStoredRoomType,
  resolveActiveRoomState,
} from "./activeRoomState";

interface ActiveRoomCtx {
  /** The couple_id of the currently active room. */
  activeRoomId: string | null;
  /** Name of the currently active room, if available. */
  activeRoomName: string | null;
  /** Type of the currently active room ('partner' or 'cof'). */
  activeRoomType: CoupleType;
  /** true when the user has a COF room. */
  hasCof: boolean;
  /** Switch the active room. */
  switchRoom: (type: CoupleType) => void;
}

const ActiveRoomContext = createContext<ActiveRoomCtx>({
  activeRoomId: null,
  activeRoomName: null,
  activeRoomType: "partner",
  hasCof: false,
  switchRoom: () => {},
});

export function ActiveRoomProvider({ children }: { children: ReactNode }) {
  const { data: dashboard } = useDashboard();

  // Persist last-chosen room in sessionStorage so a page reload keeps the selection.
  const [activeType, setActiveType] = useState<CoupleType>(() => {
    return readStoredRoomType(typeof window === "undefined" ? null : sessionStorage);
  });

  const roomState = resolveActiveRoomState({
    storedType: activeType,
    partnerRoom: dashboard?.couple
      ? { id: dashboard.couple.id, name: dashboard.couple.name }
      : null,
    cofRoom: dashboard?.cofCouple
      ? { id: dashboard.cofCouple.id, name: dashboard.cofCouple.name }
      : null,
  });

  // If the user switches to COF but loses the COF room, fall back to partner.
  useEffect(() => {
    if (activeType === "cof" && !roomState.hasCof) {
      setActiveType("partner");
      sessionStorage.removeItem(ACTIVE_ROOM_SESSION_KEY);
    }
  }, [activeType, roomState.hasCof]);

  const switchRoom = (type: CoupleType) => {
    setActiveType(type);
    sessionStorage.setItem(ACTIVE_ROOM_SESSION_KEY, type);
  };

  return (
    <ActiveRoomContext.Provider
      value={{
        activeRoomId: roomState.activeRoomId,
        activeRoomName: roomState.activeRoomName,
        activeRoomType: roomState.activeRoomType,
        hasCof: roomState.hasCof,
        switchRoom,
      }}
    >
      {children}
    </ActiveRoomContext.Provider>
  );
}

/** Returns the active room context. Must be used inside <ActiveRoomProvider>. */
export function useActiveRoom() {
  return useContext(ActiveRoomContext);
}
