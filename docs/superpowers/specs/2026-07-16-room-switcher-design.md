# Room Switcher Design

**Date:** 2026-07-16

## Goal

Make switching between the partner room and the COF room work consistently across the app without introducing a second room-selection state.

## Current State

- The app already has a room-selection state in `src/context/ActiveRoomContext.tsx`.
- The navbar already renders a `RoomSwitcher` in `src/components/Navbar.tsx`.
- Several feature pages already query by `activeRoomId` and `activeRoomType`.
- The wiring is incomplete:
  - some logic files still call room-aware hooks with only `activeRoomId`
  - some create mutations still write partner-only fields from page logic
  - the dashboard summary data is biased toward the primary partner room

The result is that the switcher is visible, but switching rooms does not reliably change the page data the user sees.

## Design

### Single Source Of Truth

`ActiveRoomContext` remains the only source of room selection.

- `activeRoomType` determines whether the user is viewing `partner` or `cof`
- `activeRoomId` is derived from the selected room type and the dashboard payload
- `switchRoom(type)` remains the only way UI code changes the active room

No page should keep its own copy of the selected room.

### UI Behavior

Keep the existing switcher locations in the navbar:

- desktop sidebar
- mobile More sheet

Add a small active-room label in page chrome where needed so the current space is obvious after switching.

### Data Flow

Room-aware hooks must always receive both:

- `roomId`
- `roomType`

This applies to:

- dashboard supporting queries
- love notes
- calendar
- check-ins
- tasks
- health
- emergency
- trusted contacts

Page logic must stop assuming that `couple_id` is always the correct write target. Mutations must consistently pass `roomId` and `roomType`, and hooks must map those into `couple_id` or `cof_id`.

### Dashboard

The dashboard needs special handling because `useDashboard()` currently returns a mixed payload:

- both room shells: `couple` and `cofCouple`
- only one room's members/check-ins/events/emergency summary

Implementation should make dashboard cards reflect the active room instead of the primary room. The lowest-risk path is:

- keep `useDashboard()` for room availability and identity
- derive active-room members, check-ins, schedule, milestone, and emergency state from room-aware hooks keyed by `activeRoomId` and `activeRoomType`

This avoids adding another broad edge-function contract change just to make switching work.

### Error Handling

- If the active room disappears, `ActiveRoomContext` falls back to `partner`
- Room-aware hooks remain disabled when `roomId` is missing
- Pages should render safe empty states instead of stale partner data when the selected room has no records yet

### Testing

Add focused regression coverage for the room-switching contract:

- `ActiveRoomContext` persists and restores the selected room
- room-aware page logic passes both `roomId` and `roomType`
- love-notes creation uses `roomId` and `roomType`, not hard-coded `couple_id`
- dashboard helpers select data for the active room rather than always using the primary partner room

## Files Expected To Change

- `src/context/ActiveRoomContext.tsx`
- `src/components/Navbar.tsx`
- `src/pages/logic/dashboard.ts`
- `src/pages/dashboard.tsx`
- `src/pages/logic/love-notes.ts`
- room-aware hooks and page logic files that still omit `roomType`
- new or expanded test files for room-selection behavior

## Non-Goals

- redesigning the navbar
- adding a second switcher elsewhere
- changing the backend room model again
- broad dashboard-summary API redesign unless a smaller client-side fix proves impossible
