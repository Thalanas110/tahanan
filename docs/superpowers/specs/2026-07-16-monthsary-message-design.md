# Monthsary Message Design

**Date:** 2026-07-16

## Goal

Let one partner write a monthsary message ahead of time and have the app automatically show it to the other partner on the next upcoming monthsary date in a blocking popup that requires reading before it can be closed.

## Scope

This feature is intentionally narrow.

- support partner rooms only
- support only monthsary messages
- target only the next upcoming monthsary
- require the relationship start date as the source of truth

## Current State

- The app already has partner-specific room data through `useDashboard()` and room-aware hooks.
- Love notes already support authored partner-to-partner messages, but they do not have delivery rules tied to a recurring monthsary.
- Global signed-in behavior is mounted through `src/components/GlobalAppLogic.tsx`.
- The `couples` table does not currently store a relationship start date.
- The app does not currently have a dedicated monthsary message table or delivery flow.

## Design

### Recommended Approach

Implement monthsary messaging as a dedicated feature instead of extending love notes or calendar events.

Reasons:

- the delivery behavior is specialized and should not complicate general love-note logic
- the user explicitly does not want a broader milestone system
- the popup delivery rules need their own state and completion handling

### Data Model

Add `relationship_start_date` to partner couples and create a dedicated `monthsary_messages` table.

`couples`

- add `relationship_start_date date null`
- this field applies only to partner rooms
- existing couples may remain null until set in Settings

`monthsary_messages`

- `id uuid primary key default gen_random_uuid()`
- `couple_id uuid references couples(id) on delete cascade`
- `created_by uuid references profiles(id) on delete cascade`
- `recipient_id uuid references profiles(id) on delete cascade`
- `title text null`
- `body text not null`
- `target_monthsary_date date not null`
- `completed_at timestamptz null`
- `created_at timestamptz default now()`

Constraints:

- one pending monthsary message per recipient for a given `couple_id` and `target_monthsary_date`
- the sender may edit that pending message until delivery

Database change policy:

- every Postgres schema change must be introduced through a new migration file
- do not modify old migration files in place

### Relationship Start Date

`relationship_start_date` is the source of truth for recurring monthsary dates.

- require it during partner-space creation
- expose it in Shared Space settings so it can be corrected later
- if an existing partner couple does not have it yet, monthsary messaging remains unavailable until it is set
- COF spaces do not participate in this feature

### Monthsary Scheduling Rules

Saving a monthsary message always targets the next upcoming monthsary only.

Examples:

- if the relationship start date is `2026-07-16` and the message is written on `2026-08-01`, the target date is `2026-08-16`
- if the message is written on a monthsary date before delivery has happened, the target is that same date
- if the relationship day is the 29th, 30th, or 31st and a month is shorter, the monthsary for that month falls on the last day of that month

The user cannot schedule a message for an arbitrary later month.

### Authoring Experience

Add a dedicated `Next Monthsary Message` composer on the Love Notes page for partner rooms only.

- keep it visually separate from regular love notes
- show the exact next delivery date derived from `relationship_start_date`
- allow creating a pending message for the next upcoming monthsary
- allow updating the existing pending message for that same target date instead of creating duplicates
- if `relationship_start_date` is missing, hide the composer and show a short prompt pointing the user to Settings

The feature should not change the behavior of ordinary love notes.

### Delivery Experience

Monthsary delivery is global signed-in behavior, not page-local behavior.

- mount the due-message check from `src/components/GlobalAppLogic.tsx`
- run it only for authenticated users with an active partner room
- compute today's monthsary date from `relationship_start_date` using the user's local date
- fetch the current user's due monthsary message where:
  - `recipient_id` is the signed-in user
  - `target_monthsary_date` matches today
  - `completed_at` is null

If a matching message exists, open a blocking popup automatically anywhere in the app.

### Blocking Popup Rules

The popup may close only after both gates are satisfied:

- the user has scrolled to the bottom of the message
- 10 seconds have passed since the popup opened

Required behavior:

- disable or hide the final close action until both gates are satisfied
- keep the popup open across route changes while it is active
- on successful close, set `completed_at` so the same message does not reopen on reload or later navigation

### Error Handling

- if message creation or update fails, show a toast and keep the draft content intact
- if the completion update fails when closing the popup, keep the popup open and show a retryable error state
- if no relationship start date exists, do not attempt scheduling or delivery
- if the active room is COF, monthsary logic stays disabled

### Testing

Add focused coverage for the feature contract.

- date utility tests for next-upcoming monthsary calculation
- date utility tests for same-day delivery and end-of-month fallback behavior
- logic tests that only the intended recipient gets a due message
- logic tests that a completed message is not selected again
- UI tests that the popup cannot close before 10 seconds
- UI tests that the popup cannot close before the reader reaches the bottom
- UI tests that the popup can close only after both conditions are true

## Files Expected To Change

- a new Supabase migration file under `supabase/migrations/`
- `src/types/database.ts`
- `src/hooks/useCouple.ts`
- `src/pages/onboarding.tsx`
- `src/pages/logic/onboarding.ts`
- `src/pages/settings.tsx`
- `src/pages/logic/settings.ts`
- `src/pages/love-notes.tsx`
- `src/pages/logic/love-notes.ts`
- `src/components/GlobalAppLogic.tsx`
- new monthsary-specific hooks, utilities, and tests

## Non-Goals

- building a generic milestone system
- reusing calendar events as the source of monthsary delivery
- changing ordinary love-note behavior beyond adding a separate monthsary composer
- supporting COF rooms
- scheduling messages for arbitrary future months
