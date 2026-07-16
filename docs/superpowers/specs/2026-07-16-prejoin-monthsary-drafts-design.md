# Pre-Join Monthsary Drafts Design

**Date:** 2026-07-16

## Goal

Allow the creator of a partner space to save exactly one monthsary message in Postgres before their partner has joined, have that draft automatically attach to the first joining partner, and deliver it even if the target monthsary date has already passed by the time the partner joins.

## Scope

This design extends the existing monthsary-message feature without broadening it.

- support partner rooms only
- still allow only one unresolved monthsary message at a time
- still target only the next upcoming monthsary when the message is saved
- allow saving before the second partner joins
- if the partner joins after the target date, let them see that previous unread message

## Current State

- `monthsary_messages` currently requires `recipient_id`, so the creator cannot persist a message before a second member exists.
- the current Love Notes monthsary composer depends on `partnerId`, which blocks save behavior until the second member has joined.
- the popup delivery logic only checks on exact monthsary dates, so an overdue unread message would not surface automatically after a later join.
- `join-couple` currently adds the second member but does not attach pending pre-join monthsary data to them.

## Design

### Recommended Approach

Keep using the existing `monthsary_messages` table and add a pre-join draft state instead of introducing a second draft table.

Reasons:

- the message still lives in Postgres immediately, which matches the product requirement
- the existing composer, query, and popup flow can be extended instead of duplicated
- the only new state needed is `recipient_id = null` until the second partner joins

### Data Model

Introduce the pre-join draft state by allowing `recipient_id` to be null until a partner joins.

`monthsary_messages`

- keep `couple_id`, `created_by`, `title`, `body`, `target_monthsary_date`, `completed_at`, and `created_at`
- change `recipient_id uuid not null` to `recipient_id uuid null`

Constraints:

- keep the feature narrow by allowing only one unresolved monthsary message per `couple_id`
- relax the `recipient_id <> created_by` check so it applies only when `recipient_id` is not null
- unresolved means `completed_at is null`

Recommended uniqueness rule:

- replace the current pending unique index with a partial unique index on `couple_id` where `completed_at is null`

That matches the intended product behavior:

- one couple
- one unresolved monthsary message
- one editable draft or unread delivery at a time

Database change policy:

- every Postgres schema change must be introduced through a new migration file
- do not modify old migration files in place

### Pre-Join Draft Lifecycle

When only the creator is in the partner space:

- the Love Notes monthsary composer is visible if `relationship_start_date` is set
- saving creates or updates the single unresolved `monthsary_messages` row for that couple
- that row is stored with:
  - `created_by = current user`
  - `recipient_id = null`
  - `target_monthsary_date = next upcoming monthsary`
  - `completed_at = null`

Before the second partner joins:

- reopening the composer loads that same unresolved draft
- saving again edits the same row instead of creating a second one
- no queue of future monthsary messages is allowed

### Join-Couple Assignment

When the second member joins through `join-couple`:

- the membership is created first
- in the same request, unresolved monthsary draft rows for that `couple_id` with `recipient_id is null` are assigned to the joining user by setting `recipient_id = auth user id`

Implementation should do this with privileged server-side write access, not by widening ordinary client-side update permissions more than necessary.

Recommended path:

- keep normal RLS narrow for app clients
- use the edge function's trusted server-side path after membership creation to assign the pending draft

Assignment rules:

- only unresolved rows are assigned
- only rows for that specific `couple_id` are assigned
- only rows with `recipient_id is null` are assigned

### Composer Behavior

The Love Notes page remains the authoring surface.

- show the `Next Monthsary Message` composer for partner rooms when `relationship_start_date` exists
- do not block save just because no partner has joined yet
- when no partner has joined, explain that the message is being saved for the future partner who joins this space
- when a partner has joined, keep the existing assigned-recipient editing behavior

Composer selection logic should distinguish between authoring and delivery:

- authoring should find the creator's unresolved monthsary row for the couple
- delivery should find the recipient's unread due row

Do not keep relying on a single helper that assumes both an existing `recipient_id` and an exact-date delivery match.

### Delivery Rules

Monthsary delivery should become due-date based, not exact-same-day gated.

Current behavior is too narrow because it requires "today is a monthsary" before checking for delivery.

New rule:

- a monthsary popup is due when:
  - `recipient_id` is the signed-in user
  - `completed_at is null`
  - `target_monthsary_date <= today` in the user's local calendar

That supports both cases:

- partner joined before the target date: the popup opens on the target monthsary date
- partner joined after the target date: the popup opens as an overdue unread message

If unexpected legacy data ever produces more than one due unread row, delivery should pick the oldest due message first.

### Blocking Popup Rules

Keep the current popup completion behavior.

- it auto-opens globally for the due recipient
- it requires scrolling to the bottom
- it requires 10 seconds to pass before close is allowed
- closing marks `completed_at`

No additional dismiss states or snooze behavior are introduced.

### Security And RLS

RLS must support both pre-join authoring and post-join delivery without exposing broader access than needed.

Creator behavior:

- the creator can insert an unresolved monthsary draft with `recipient_id = null`
- the creator can update their unresolved draft while it is still incomplete

Recipient behavior:

- the assigned recipient can read their unresolved message
- the assigned recipient can mark it complete after reading

Join-time assignment behavior:

- assignment from `recipient_id = null` to the joining user should happen through the trusted server-side join flow

RLS should not require the client app to perform privileged reassignment logic on its own.

### Testing

Add focused regression coverage for the full contract.

Database and logic tests:

- saving a pre-join draft succeeds with `recipient_id = null`
- only one unresolved monthsary message can exist per couple
- reopening the composer before join edits the same draft row
- join-time assignment attaches the unresolved draft to the joining user
- overdue unread rows are treated as due when `target_monthsary_date <= today`

UI and behavior tests:

- the composer remains available before partner join if `relationship_start_date` exists
- the UI explains that the message is saved for the future partner
- the popup appears immediately after partner join when the target date is already in the past
- the popup completion gating still requires bottom scroll plus 10 seconds

## Files Expected To Change

- a new Supabase migration file under `supabase/migrations/`
- `src/types/database.ts`
- `src/hooks/useMonthsaryMessages.ts`
- `src/pages/logic/love-notes.ts`
- `src/pages/love-notes.tsx`
- `src/components/logic/MonthsaryMessageDialog.ts`
- `src/lib/monthsaryMessageDraft.ts`
- `supabase/functions/join-couple/index.ts`
- new or updated tests for monthsary draft, assignment, and overdue delivery behavior

## Non-Goals

- introducing a separate `monthsary_message_drafts` table
- allowing multiple queued future monthsary messages
- supporting COF rooms
- building a generic recurring milestone or anniversary scheduler
- changing the popup read-to-close rules
