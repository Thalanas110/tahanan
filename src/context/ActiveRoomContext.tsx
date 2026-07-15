import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useDashboard } from "@/hooks/useCouple";
import type { CoupleType } from "@/types/database";

interface ActiveRoomCtx {
  /** The couple_id of the currently active room. */
  activeRoomId: string | null;
  /** Type of the currently active room ('partner' or 'cof'). */
  activeRoomType: CoupleType;
  /** true when the user has a COF room. */
  hasCof: boolean;
  /** Switch the active room. */
  switchRoom: (type: CoupleType) => void;
}

const ActiveRoomContext = createContext<ActiveRoomCtx>({
  activeRoomId: null,
  activeRoomType: "partner",
  hasCof: false,
  switchRoom: () => {},
});

const SESSION_KEY = "tahanan_active_room";

export function ActiveRoomProvider({ children }: { children: ReactNode }) {
  const { data: dashboard } = useDashboard();

  const partnerRoomId = dashboard?.couple?.id ?? null;
  const cofRoomId = dashboard?.cofCouple?.id ?? null;
  const hasCof = !!cofRoomId;

  // Persist last-chosen room in sessionStorage so a page reload keeps the selection.
  const [activeType, setActiveType] = useState<CoupleType>(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored === "cof" ? "cof" : "partner";
  });

  // If the user switches to COF but loses the COF room, fall back to partner.
  useEffect(() => {
    if (activeType === "cof" && !cofRoomId) {
      setActiveType("partner");
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [activeType, cofRoomId]);

  const switchRoom = (type: CoupleType) => {
    setActiveType(type);
    sessionStorage.setItem(SESSION_KEY, type);
  };

  const activeRoomId =
    activeType === "cof" ? cofRoomId : partnerRoomId;

  return (
    <ActiveRoomContext.Provider
      value={{ activeRoomId, activeRoomType: activeType, hasCof, switchRoom }}
    >
      {children}
    </ActiveRoomContext.Provider>
  );
}

/** Returns the active room context. Must be used inside <ActiveRoomProvider>. */
export function useActiveRoom() {
  return useContext(ActiveRoomContext);
}
