# Monthsary Dialog Short-Message Design

**Date:** 2026-07-19

## Goal

Prevent a short monthsary message from permanently locking its reader in the popup while preserving the existing ten-second reading period.

## Root Cause

The dialog records that the reader has reached the bottom only from the message container's scroll event. When a message fits entirely inside that container, no scroll event can occur, so the close button can never unlock.

## Design

After the message container renders, the dialog will compare its scrollable height with its visible height.

- If the message fits without vertical overflow, it is already at the bottom and the dialog marks reading complete automatically.
- If the message overflows, the current scroll-to-bottom behavior remains unchanged.
- In both cases, closing remains disabled until ten seconds after the dialog opened.

No database, delivery, timer, or completion-mutation behavior changes.

## Testing

Extract or extend the existing pure dialog state helper with a focused regression test that treats a non-scrollable message container as already at the bottom. Keep the existing tests that require both bottom reach and ten seconds.

## Scope

Only the monthsary dialog's read-completion gate changes. The popup remains blocking until both its applicable reading condition and the existing timer condition are met.
