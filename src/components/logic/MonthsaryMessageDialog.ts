import { useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { toast } from 'sonner';
import { useActiveRoom } from '@/context/ActiveRoomContext';
import { useAuth } from '@/hooks/useAuth';
import {
  useCompleteMonthsaryMessage,
  useMonthsaryMessages,
} from '@/hooks/useMonthsaryMessages';
import { findDueMonthsaryMessage } from '@/lib/monthsaryMessageDelivery';
import {
  canDismissMonthsaryMessage,
  hasReachedMonthsaryMessageBottom,
} from '@/lib/monthsaryMessageState';
import type { MonthsaryMessage } from '@/types/database';

export function useMonthsaryMessageDialogLogic() {
  const { user } = useAuth();
  const { activeRoomId, activeRoomType } = useActiveRoom();
  const shouldCheck =
    activeRoomType === 'partner' &&
    !!activeRoomId &&
    !!user?.id;

  const { data: monthsaryMessages = [] } = useMonthsaryMessages(activeRoomId, shouldCheck);
  const completeMonthsaryMessage = useCompleteMonthsaryMessage();

  const [activeMessage, setActiveMessage] = useState<MonthsaryMessage | null>(null);
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messageContentRef = useRef<HTMLDivElement>(null);

  const dueMessage = useMemo(
    () =>
      shouldCheck
        ? findDueMonthsaryMessage(monthsaryMessages, user?.id ?? null, new Date())
        : null,
    [monthsaryMessages, shouldCheck, user?.id],
  );

  useEffect(() => {
    if (!dueMessage) return;

    setActiveMessage((current) => current ?? dueMessage);
  }, [dueMessage]);

  useEffect(() => {
    if (!activeMessage) return;

    const opened = Date.now();
    const contentElement = messageContentRef.current;
    setOpenedAt(opened);
    setNow(opened);
    setHasReachedBottom(
      contentElement
        ? hasReachedMonthsaryMessageBottom({
            scrollTop: contentElement.scrollTop,
            clientHeight: contentElement.clientHeight,
            scrollHeight: contentElement.scrollHeight,
          })
        : false,
    );
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
    if (
      hasReachedMonthsaryMessageBottom({
        scrollTop: element.scrollTop,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      })
    ) {
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
    messageContentRef,
    handleScroll,
    handleClose,
  };
}
