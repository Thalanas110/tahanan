import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMonthsaryMessageDialogLogic } from './logic/MonthsaryMessageDialog';

export function MonthsaryMessageDialog() {
  const {
    activeMessage,
    canClose,
    isCompleting,
    errorMessage,
    hasReachedBottom,
    secondsRemaining,
    messageContentRef,
    handleScroll,
    handleClose,
  } = useMonthsaryMessageDialogLogic();

  if (!activeMessage) return null;

  return (
    <Dialog open>
      <DialogContent
        className="max-w-lg border-primary/20 bg-card"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">
            {activeMessage.title || 'Happy monthsary'}
          </DialogTitle>
        </DialogHeader>

        <div
          ref={messageContentRef}
          className="max-h-[55vh] overflow-y-auto rounded-lg border border-border/60 bg-muted/30 p-5"
          onScroll={handleScroll}
        >
          <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed">
            {activeMessage.body}
          </p>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            {hasReachedBottom
              ? 'Reading complete.'
              : 'Scroll to the bottom to unlock the close button.'}
          </p>
          <p>
            {secondsRemaining > 0
              ? `${secondsRemaining}s remaining before you can close this message.`
              : 'Time requirement met.'}
          </p>
          {errorMessage ? <p className="text-destructive">{errorMessage}</p> : null}
        </div>

        <Button onClick={() => void handleClose()} disabled={!canClose || isCompleting}>
          {isCompleting ? 'Closing...' : 'Close message'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
