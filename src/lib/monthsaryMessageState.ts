export function hasReachedMonthsaryMessageBottom(input: {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  tolerancePx?: number;
}): boolean {
  return (
    input.scrollTop + input.clientHeight >=
    input.scrollHeight - (input.tolerancePx ?? 8)
  );
}

export function canDismissMonthsaryMessage(input: {
  openedAt: number | null;
  now: number;
  hasReachedBottom: boolean;
  minimumMs?: number;
}): boolean {
  if (!input.hasReachedBottom || input.openedAt === null) {
    return false;
  }

  return input.now - input.openedAt >= (input.minimumMs ?? 10_000);
}
