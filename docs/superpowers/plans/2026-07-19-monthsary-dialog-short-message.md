# Monthsary Dialog Short-Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a non-scrollable monthsary message to unlock after the existing ten-second reading period.

**Architecture:** Centralize the dialog's bottom-reach measurement in the existing pure state module. The dialog logic will evaluate that helper as soon as the rendered message container is available and when it scrolls, so fitting content counts as already read while overflowed content keeps the current bottom-scroll requirement.

**Tech Stack:** React 19, TypeScript, Node `node:test` via `npx tsx --test`, Vite

## Global Constraints

- Preserve the existing ten-second minimum before a monthsary message can close.
- Preserve bottom-scroll gating for messages that overflow their content container.
- Do not change popup delivery, persistence, completion mutations, or database schema.
- Add regression coverage before production code.

---

## File Structure

- Modify `src/lib/monthsaryMessageState.ts`: expose a pure helper that evaluates whether message-container scroll metrics are at the bottom.
- Modify `src/lib/monthsaryMessageState.test.ts`: cover the non-scrollable message regression and the existing overflow threshold.
- Modify `src/components/logic/MonthsaryMessageDialog.ts`: measure the content container on dialog open and route scroll events through the shared helper.
- Modify `src/components/MonthsaryMessageDialog.tsx`: attach the dialog logic's ref to the scrollable message container.

### Task 1: Define And Test The Read-Completion Measurement

**Files:**
- Modify: `src/lib/monthsaryMessageState.ts`
- Test: `src/lib/monthsaryMessageState.test.ts`

**Interfaces:**
- Produces: `hasReachedMonthsaryMessageBottom(input: { scrollTop: number; clientHeight: number; scrollHeight: number; tolerancePx?: number }): boolean`
- Consumes: existing `canDismissMonthsaryMessage` behavior without changing its signature.

- [ ] **Step 1: Write the failing regression tests**

```ts
import {
  canDismissMonthsaryMessage,
  hasReachedMonthsaryMessageBottom,
} from './monthsaryMessageState.ts';

test('hasReachedMonthsaryMessageBottom treats a message with no overflow as already read', () => {
  assert.equal(
    hasReachedMonthsaryMessageBottom({
      scrollTop: 0,
      clientHeight: 240,
      scrollHeight: 240,
    }),
    true,
  );
});

test('hasReachedMonthsaryMessageBottom stays false until an overflowing message reaches its bottom', () => {
  assert.equal(
    hasReachedMonthsaryMessageBottom({
      scrollTop: 0,
      clientHeight: 240,
      scrollHeight: 600,
    }),
    false,
  );
  assert.equal(
    hasReachedMonthsaryMessageBottom({
      scrollTop: 352,
      clientHeight: 240,
      scrollHeight: 600,
    }),
    true,
  );
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx tsx --test src/lib/monthsaryMessageState.test.ts`

Expected: FAIL because `hasReachedMonthsaryMessageBottom` is not exported.

- [ ] **Step 3: Implement the minimal pure helper**

```ts
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
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npx tsx --test src/lib/monthsaryMessageState.test.ts`

Expected: PASS with all five subtests passing.

- [ ] **Step 5: Commit the tested state helper**

```bash
git add src/lib/monthsaryMessageState.ts src/lib/monthsaryMessageState.test.ts
git commit -m "test: cover short monthsary message completion"
```

### Task 2: Apply The Measurement When The Dialog Opens

**Files:**
- Modify: `src/components/logic/MonthsaryMessageDialog.ts`
- Modify: `src/components/MonthsaryMessageDialog.tsx`

**Interfaces:**
- Consumes: `hasReachedMonthsaryMessageBottom(input)` from `src/lib/monthsaryMessageState.ts`.
- Produces: `messageContentRef`, a `RefObject<HTMLDivElement | null>` returned by `useMonthsaryMessageDialogLogic` for the message container.

- [ ] **Step 1: Add the dialog ref and reuse the tested helper**

```ts
import { useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import {
  canDismissMonthsaryMessage,
  hasReachedMonthsaryMessageBottom,
} from '@/lib/monthsaryMessageState';

const messageContentRef = useRef<HTMLDivElement>(null);

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
  // Keep the existing interval setup and cleanup unchanged.
}, [activeMessage?.id]);

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
```

- [ ] **Step 2: Attach the returned ref to the scroll container**

```tsx
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

<div
  ref={messageContentRef}
  className="max-h-[55vh] overflow-y-auto rounded-lg border border-border/60 bg-muted/30 p-5"
  onScroll={handleScroll}
>
```

- [ ] **Step 3: Run focused and project-level verification**

Run: `npx tsx --test src/lib/monthsaryMessageState.test.ts`

Expected: PASS with all five subtests passing.

Run: `npm run typecheck`

Expected: PASS with no TypeScript errors.

Run: `npm run build`

Expected: PASS with a Vite production build generated in `dist`.

- [ ] **Step 4: Commit the dialog fix**

```bash
git add src/components/logic/MonthsaryMessageDialog.ts src/components/MonthsaryMessageDialog.tsx
git commit -m "fix: unlock short monthsary messages"
```
