import { useEffect, useMemo, useState, type UIEvent } from 'react';
import { toast } from 'sonner';
import { useActiveRoom } from '@/context/ActiveRoomContext';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard, useCoupleRecord } from '@/hooks/useCouple';
import {
  useCompleteMonthsaryMessage,
  useMonthsaryMessages,
} from '@/hooks/useMonthsaryMessages';
import { resolveCurrentCouple } from '@/lib/coupleSource';
import { findPendingMonthsaryMessage } from '@/lib/monthsaryMessageDraft';
import { canDismissMonthsaryMessage } from '@/lib/monthsaryMessageState';
import { isMonthsaryDate, toLocalDateKey } from '@/lib/monthsaryDates';
import type { MonthsaryMessage } from '@/types/database';

export function useMonthsaryMessageDialogLogic() {
  const { user } = useAuth();
  const { activeRoomId, activeRoomType } = useActiveRoom();
  const { data: dashboard } = useDashboard(!!user);
  const { data: directCouple } = useCoupleRecord(
    activeRoomType === 'partner' ? activeRoomId : null,
    !!user,
  );
  const currentCouple = resolveCurrentCouple({
    dashboardCouple: dashboard?.couple,
    directCouple,
  });
  const relationshipStartDate =
    activeRoomType === 'partner' ? currentCouple?.relationship_start_date ?? null : null;
  const shouldCheck =
    activeRoomType === 'partner' &&
    !!activeRoomId &&
    !!user?.id &&
    !!relationshipStartDate &&
    isMonthsaryDate(relationshipStartDate);

  const { data: monthsaryMessages = [] } = useMonthsaryMessages(activeRoomId, shouldCheck);
  const completeMonthsaryMessage = useCompleteMonthsaryMessage();

  const [activeMessage, setActiveMessage] = useState<MonthsaryMessage | null>(null);
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const todayKey = toLocalDateKey(new Date());
  const dueMessage = useMemo(
    () =>
      shouldCheck
        ? findPendingMonthsaryMessage(monthsaryMessages, user?.id ?? null, todayKey)
        : null,
    [monthsaryMessages, shouldCheck, todayKey, user?.id],
  );

  useEffect(() => {
    if (!dueMessage) return;

    setActiveMessage((current) => current ?? dueMessage);
  }, [dueMessage]);

  useEffect(() => {
    if (!activeMessage) return;

    const opened = Date.now();
    setOpenedAt(opened);
    setNow(opened);
    setHasReachedBottom(false);
    setErrorMessage(null);

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [activeMessage?.id]);

  const canClose = canDismissMonthsaryMessage({
    openedAt,
    now,
    hasReachedBottom,
  });

  const secondsRemaining =
    openedAt === null ? 10 : Math.max(0, Math.ceil((10_000 - (now - openedAt)) / 1_000));

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    const reachedBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 8;
    if (reachedBottom) {
      setHasReachedBottom(true);
    }
  }

  async function handleClose() {
    if (!activeMessage || !canClose) return;

    try {
      setErrorMessage(null);
      await completeMonthsaryMessage.mutateAsync({
        id: activeMessage.id,
        completedAt: new Date().toISOString(),
      });
      setActiveMessage(null);
    } catch (error) {
      const message = 'Failed to mark the monthsary message as read';
      setErrorMessage(message);
      toast.error(message);
    }
  }

  return {
    activeMessage,
    canClose,
    isCompleting: completeMonthsaryMessage.isPending,
    errorMessage,
    hasReachedBottom,
    secondsRemaining,
    handleScroll,
    handleClose,
  };
}
