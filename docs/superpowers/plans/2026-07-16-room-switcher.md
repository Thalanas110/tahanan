# Room Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make partner/COF switching behave consistently across room-scoped pages using the existing `ActiveRoomContext` and navbar switcher.

**Architecture:** Keep `src/context/ActiveRoomContext.tsx` as the single source of room selection, extract pure helpers for room selection and room-scoped view data, add a reusable `useRoomMembers` query so page logic stops reading the wrong roster from `dashboard.members`, and update the remaining consumers that still ignore `roomType` or assume the partner room is always primary.

**Tech Stack:** React 19, TypeScript, Wouter, TanStack Query, Supabase JS, Node `node:test` with `--experimental-strip-types`

## Global Constraints

- Reuse `src/context/ActiveRoomContext.tsx`; do not add a second room-selection state.
- Keep the existing switcher locations in `src/components/Navbar.tsx`.
- Do not redesign the navbar.
- Do not change the backend room model.
- Do not change the `dashboard-summary` edge-function contract unless the client-side fix proves impossible.
- Room-aware reads and writes must always pass both `roomId` and `roomType`.
- Add regression coverage before production code for each changed behavior.

---

### Task 1: Stabilize Active Room Resolution

**Files:**
- Create: `src/context/activeRoomState.ts`
- Create: `src/context/activeRoomState.test.ts`
- Modify: `src/context/ActiveRoomContext.tsx`
- Modify: `src/components/logic/ProtectedRoute.ts`

**Interfaces:**
- Consumes: `CoupleType` from `src/types/database.ts`, `dashboard?.couple`, `dashboard?.cofCouple`
- Produces:
  - `ACTIVE_ROOM_SESSION_KEY = 'tahanan_active_room'`
  - `readStoredRoomType(storage: Pick<Storage, 'getItem'> | null | undefined): CoupleType`
  - `hasAnyRoom(input: { couple: { id: string } | null; cofCouple: { id: string } | null } | null | undefined): boolean`
  - `resolveActiveRoomState(input: { storedType: CoupleType; partnerRoom: { id: string; name: string } | null; cofRoom: { id: string; name: string } | null }): { activeRoomType: CoupleType; activeRoomId: string | null; activeRoomName: string | null; hasCof: boolean }`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasAnyRoom,
  readStoredRoomType,
  resolveActiveRoomState,
} from './activeRoomState.ts';

test('readStoredRoomType accepts only partner or cof', () => {
  assert.equal(readStoredRoomType({ getItem: () => 'partner' }), 'partner');
  assert.equal(readStoredRoomType({ getItem: () => 'cof' }), 'cof');
  assert.equal(readStoredRoomType({ getItem: () => 'junk' }), 'partner');
});

test('resolveActiveRoomState falls back to cof when partner room is missing', () => {
  assert.deepEqual(
    resolveActiveRoomState({
      storedType: 'partner',
      partnerRoom: null,
      cofRoom: { id: 'cof-1', name: 'Circle' },
    }),
    {
      activeRoomType: 'cof',
      activeRoomId: 'cof-1',
      activeRoomName: 'Circle',
      hasCof: true,
    },
  );
});

test('hasAnyRoom treats a cof-only dashboard as paired', () => {
  assert.equal(hasAnyRoom({ couple: null, cofCouple: { id: 'cof-1' } }), true);
  assert.equal(hasAnyRoom({ couple: null, cofCouple: null }), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test src/context/activeRoomState.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/context/activeRoomState.ts`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/context/activeRoomState.ts
import type { CoupleType } from '@/types/database';

export const ACTIVE_ROOM_SESSION_KEY = 'tahanan_active_room';

export function readStoredRoomType(
  storage: Pick<Storage, 'getItem'> | null | undefined,
): CoupleType {
  const stored = storage?.getItem(ACTIVE_ROOM_SESSION_KEY);
  return stored === 'cof' ? 'cof' : 'partner';
}

export function hasAnyRoom(
  input: { couple: { id: string } | null; cofCouple: { id: string } | null } | null | undefined,
): boolean {
  return Boolean(input?.couple?.id || input?.cofCouple?.id);
}

export function resolveActiveRoomState(input: {
  storedType: CoupleType;
  partnerRoom: { id: string; name: string } | null;
  cofRoom: { id: string; name: string } | null;
}) {
  const activeRoomType =
    input.storedType === 'cof'
      ? input.cofRoom
        ? 'cof'
        : input.partnerRoom
          ? 'partner'
          : 'cof'
      : input.partnerRoom
        ? 'partner'
        : input.cofRoom
          ? 'cof'
          : 'partner';

  const activeRoom = activeRoomType === 'cof' ? input.cofRoom : input.partnerRoom;

  return {
    activeRoomType,
    activeRoomId: activeRoom?.id ?? null,
    activeRoomName: activeRoom?.name ?? null,
    hasCof: Boolean(input.cofRoom),
  };
}
```

```ts
// src/context/ActiveRoomContext.tsx
import {
  ACTIVE_ROOM_SESSION_KEY,
  readStoredRoomType,
  resolveActiveRoomState,
} from './activeRoomState';

interface ActiveRoomCtx {
  activeRoomId: string | null;
  activeRoomName: string | null;
  activeRoomType: CoupleType;
  hasCof: boolean;
  switchRoom: (type: CoupleType) => void;
}

const [activeType, setActiveType] = useState<CoupleType>(() =>
  readStoredRoomType(typeof window === 'undefined' ? null : sessionStorage),
);

const roomState = resolveActiveRoomState({
  storedType: activeType,
  partnerRoom: dashboard?.couple
    ? { id: dashboard.couple.id, name: dashboard.couple.name }
    : null,
  cofRoom: dashboard?.cofCouple
    ? { id: dashboard.cofCouple.id, name: dashboard.cofCouple.name }
    : null,
});

const switchRoom = (type: CoupleType) => {
  setActiveType(type);
  sessionStorage.setItem(ACTIVE_ROOM_SESSION_KEY, type);
};
```

```ts
// src/components/logic/ProtectedRoute.ts
import { hasAnyRoom } from '@/context/activeRoomState';

const isUncoupled = !hasAnyRoom(dashboard ?? null);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test src/context/activeRoomState.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/context/activeRoomState.ts src/context/activeRoomState.test.ts src/context/ActiveRoomContext.tsx src/components/logic/ProtectedRoute.ts
git commit -m "feat: stabilize active room selection"
```

### Task 2: Add Room Member Query And Shared Participant Helpers

**Files:**
- Create: `src/hooks/useRoomMembers.ts`
- Create: `src/lib/roomParticipants.ts`
- Create: `src/lib/roomParticipants.test.ts`
- Modify: `src/types/database.ts`
- Modify: `src/pages/logic/check-ins.ts`
- Modify: `src/pages/logic/calendar.ts`
- Modify: `src/pages/logic/health.ts`
- Modify: `src/pages/logic/emergency.ts`
- Modify: `src/pages/logic/tasks.ts`
- Modify: `src/pages/calendar.tsx`
- Modify: `src/pages/tasks.tsx`

**Interfaces:**
- Consumes: `activeRoomId`, `activeRoomType`, `Profile`, `CoupleType`
- Produces:
  - `export interface RoomMemberSummary { user_id: string; profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null }`
  - `useRoomMembers(roomId: string | null | undefined, roomType: CoupleType)`
  - `getMyMember(members: RoomMemberSummary[], userId: string | null | undefined): RoomMemberSummary | null`
  - `getPartnerMember(members: RoomMemberSummary[], userId: string | null | undefined): RoomMemberSummary | null`
  - `getAssigneeName(members: RoomMemberSummary[], assigneeId: string | null | undefined): string | null`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAssigneeName,
  getMyMember,
  getPartnerMember,
} from './roomParticipants.ts';

const members = [
  { user_id: 'me', profiles: { id: 'me', display_name: 'Adriaan', avatar_url: null } },
  { user_id: 'you', profiles: { id: 'you', display_name: 'Mika', avatar_url: null } },
];

test('getMyMember returns the signed-in user for the active room roster', () => {
  assert.equal(getMyMember(members, 'me')?.profiles?.display_name, 'Adriaan');
});

test('getPartnerMember returns the non-user participant for the active room roster', () => {
  assert.equal(getPartnerMember(members, 'me')?.user_id, 'you');
});

test('getAssigneeName resolves assignee names from the active room roster', () => {
  assert.equal(getAssigneeName(members, 'you'), 'Mika');
  assert.equal(getAssigneeName(members, null), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test src/lib/roomParticipants.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/roomParticipants.ts`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/types/database.ts
export interface RoomMemberSummary {
  user_id: string;
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null;
}
```

```ts
// src/hooks/useRoomMembers.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CoupleType, RoomMemberSummary } from '@/types/database';

export const roomMembersQueryKey = (roomId: string | null, roomType: CoupleType) =>
  ['room-members', roomId, roomType] as const;

export function useRoomMembers(roomId: string | null | undefined, roomType: CoupleType) {
  return useQuery({
    queryKey: roomMembersQueryKey(roomId ?? null, roomType),
    enabled: !!roomId,
    queryFn: async () => {
      const table = roomType === 'cof' ? 'cof_members' : 'couple_members';
      const idColumn = roomType === 'cof' ? 'cof_id' : 'couple_id';
      const { data, error } = await supabase
        .from(table)
        .select('user_id, profiles(id, display_name, avatar_url)')
        .eq(idColumn, roomId!);
      if (error) throw error;
      return data as RoomMemberSummary[];
    },
  });
}
```

```ts
// src/lib/roomParticipants.ts
import type { RoomMemberSummary } from '@/types/database';

export function getMyMember(members: RoomMemberSummary[], userId: string | null | undefined) {
  return members.find((member) => member.user_id === userId) ?? null;
}

export function getPartnerMember(members: RoomMemberSummary[], userId: string | null | undefined) {
  return members.find((member) => member.user_id !== userId) ?? null;
}

export function getAssigneeName(
  members: RoomMemberSummary[],
  assigneeId: string | null | undefined,
) {
  if (!assigneeId) return null;
  return members.find((member) => member.user_id === assigneeId)?.profiles?.display_name ?? null;
}
```

```ts
// src/pages/logic/check-ins.ts
const { data: roomMembers = [] } = useRoomMembers(activeRoomId, activeRoomType);
const myProfile = getMyMember(roomMembers, user?.id)?.profiles ?? null;
const partnerProfile = getPartnerMember(roomMembers, user?.id)?.profiles ?? null;
```

```ts
// src/pages/logic/health.ts and src/pages/logic/emergency.ts
const { data: roomMembers = [] } = useRoomMembers(activeRoomId, activeRoomType);
const myProfile = getMyMember(roomMembers, user?.id)?.profiles ?? null;
const partnerProfile = getPartnerMember(roomMembers, user?.id)?.profiles ?? null;
```

```ts
// src/pages/logic/calendar.ts
const { data: roomMembers = [] } = useRoomMembers(activeRoomId, activeRoomType);
const myProfile = getMyMember(roomMembers, user?.id)?.profiles ?? null;
const partnerProfile = getPartnerMember(roomMembers, user?.id)?.profiles ?? null;

return {
  events,
  isLoading,
  createEvent,
  updateEvent,
  deleteEvent,
  roomMembers,
  dashboard,
  user,
  isAdding,
  setIsAdding,
  editingId,
  title,
  setTitle,
  date,
  setDate,
  time,
  setTime,
  assignee,
  setAssignee,
  myProfile,
  partnerProfile,
  handleSubmit,
  handleEdit,
  groupedEvents,
  sortedDays,
};
```

```ts
// src/pages/logic/tasks.ts
const { data: roomMembers = [] } = useRoomMembers(activeRoomId, activeRoomType);
const myProfile = getMyMember(roomMembers, user?.id)?.profiles ?? null;
const partnerProfile = getPartnerMember(roomMembers, user?.id)?.profiles ?? null;

return {
  tasks,
  isLoading,
  createTask,
  updateTask,
  updateStatus,
  deleteTask,
  roomMembers,
  isAdding,
  setIsAdding,
  editingId,
  title,
  setTitle,
  assignee,
  setAssignee,
  priority,
  setPriority,
  myProfile,
  partnerProfile,
  handleSubmit,
  handleEdit,
  handleToggleStatus,
  pendingTasks,
  completedTasks,
};
```

```tsx
// src/pages/calendar.tsx and src/pages/tasks.tsx
const assigneeName = getAssigneeName(roomMembers, event.assigned_to);
<TaskItem members={roomMembers} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test src/context/activeRoomState.test.ts src/lib/roomParticipants.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRoomMembers.ts src/lib/roomParticipants.ts src/lib/roomParticipants.test.ts src/types/database.ts src/pages/logic/check-ins.ts src/pages/logic/calendar.ts src/pages/logic/health.ts src/pages/logic/emergency.ts src/pages/logic/tasks.ts src/pages/calendar.tsx src/pages/tasks.tsx
git commit -m "feat: use active-room members across room pages"
```

### Task 3: Make Dashboard And Global Room Logic Active-Room Aware

**Files:**
- Create: `src/lib/roomDashboard.ts`
- Create: `src/lib/roomDashboard.test.ts`
- Modify: `src/components/AppLayout.tsx`
- Modify: `src/pages/logic/dashboard.ts`
- Modify: `src/pages/dashboard.tsx`
- Modify: `src/components/logic/Navbar.ts`
- Modify: `src/components/logic/GlobalAppLogic.ts`

**Interfaces:**
- Consumes: `RoomMemberSummary[]`, `DailyCheckin[]`, `CalendarEvent[]`, `EmergencyEvent[]`, `userId`, `activeRoomId`, `activeRoomType`, `activeRoomName`
- Produces:
  - `pickLatestCheckins(checkins: DailyCheckin[], userId: string | null | undefined): { myLatestCheckin: DailyCheckin | null; partnerLatestCheckin: DailyCheckin | null }`
  - `pickTodaysEvents(events: CalendarEvent[], now?: Date): CalendarEvent[]`
  - `pickActiveEmergency(events: EmergencyEvent[]): EmergencyEvent | null`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  pickActiveEmergency,
  pickLatestCheckins,
  pickTodaysEvents,
} from './roomDashboard.ts';

test('pickLatestCheckins keeps the newest record per participant', () => {
  const { myLatestCheckin, partnerLatestCheckin } = pickLatestCheckins(
    [
      { id: 'a', user_id: 'me', created_at: '2026-07-16T01:00:00.000Z' },
      { id: 'b', user_id: 'me', created_at: '2026-07-16T03:00:00.000Z' },
      { id: 'c', user_id: 'you', created_at: '2026-07-16T02:00:00.000Z' },
    ] as any,
    'me',
  );

  assert.equal(myLatestCheckin?.id, 'b');
  assert.equal(partnerLatestCheckin?.id, 'c');
});

test('pickTodaysEvents filters out non-today records', () => {
  const events = pickTodaysEvents(
    [
      { id: 'today', start_time: '2026-07-16T09:00:00.000Z' },
      { id: 'later', start_time: '2026-07-18T09:00:00.000Z' },
    ] as any,
    new Date('2026-07-16T12:00:00.000Z'),
  );

  assert.deepEqual(events.map((event) => event.id), ['today']);
});

test('pickActiveEmergency returns the newest unresolved event', () => {
  const emergency = pickActiveEmergency(
    [
      { id: 'resolved', status: 'resolved', created_at: '2026-07-16T01:00:00.000Z' },
      { id: 'active', status: 'active', created_at: '2026-07-16T02:00:00.000Z' },
    ] as any,
  );

  assert.equal(emergency?.id, 'active');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test src/lib/roomDashboard.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/roomDashboard.ts`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/roomDashboard.ts
import { endOfDay, startOfDay } from 'date-fns';
import type { CalendarEvent, DailyCheckin, EmergencyEvent } from '@/types/database';

export function pickLatestCheckins(
  checkins: DailyCheckin[],
  userId: string | null | undefined,
) {
  const sorted = [...checkins].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );

  return {
    myLatestCheckin: sorted.find((checkin) => checkin.user_id === userId) ?? null,
    partnerLatestCheckin: sorted.find((checkin) => checkin.user_id !== userId) ?? null,
  };
}

export function pickTodaysEvents(events: CalendarEvent[], now = new Date()) {
  const start = startOfDay(now).getTime();
  const end = endOfDay(now).getTime();
  return events.filter((event) => {
    const time = new Date(event.start_time).getTime();
    return time >= start && time <= end;
  });
}

export function pickActiveEmergency(events: EmergencyEvent[]) {
  return (
    [...events]
      .filter((event) => event.status !== 'resolved')
      .sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      )[0] ?? null
  );
}
```

```ts
// src/pages/logic/dashboard.ts
const { activeRoomId, activeRoomName, activeRoomType } = useActiveRoom();
const { data: roomMembers = [] } = useRoomMembers(activeRoomId, activeRoomType);
const { data: checkins = [] } = useCheckins(activeRoomId, activeRoomType);
const { data: events = [] } = useCalendarEvents(activeRoomId, activeRoomType);
const { data: emergencies = [] } = useEmergencyEvents(activeRoomId, activeRoomType);

const myProfile = getMyMember(roomMembers, user?.id)?.profiles ?? null;
const partnerProfile = getPartnerMember(roomMembers, user?.id)?.profiles ?? null;
const { myLatestCheckin, partnerLatestCheckin } = pickLatestCheckins(checkins, user?.id);
const todaysEvents = pickTodaysEvents(events);
const activeEmergency = pickActiveEmergency(emergencies);
const upcomingAnniversary = useUpcomingMilestone(activeRoomId, activeRoomType);

return {
  dashboard,
  activeRoomId,
  activeRoomName,
  activeRoomType,
  user,
  myProfile,
  partnerProfile,
  myLatestCheckin,
  partnerLatestCheckin,
  todaysEvents,
  activeEmergency,
  upcomingAnniversary,
};
```

```tsx
// src/components/AppLayout.tsx
const { activeRoomName, activeRoomType } = useActiveRoom();

<div className="mb-4">
  <p className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
    {activeRoomType === 'cof' ? 'COF Space' : 'Partner Space'}: {activeRoomName ?? 'Shared Space'}
  </p>
</div>
```

```tsx
// src/pages/dashboard.tsx
const {
  dashboard,
  activeRoomId,
  activeRoomName,
  activeRoomType,
  user,
  myProfile,
  partnerProfile,
  myLatestCheckin,
  partnerLatestCheckin,
  todaysEvents,
  activeEmergency,
  upcomingAnniversary,
} = useDashboardLogic();

if (!dashboard || !activeRoomId) return null;
```

```ts
// src/components/logic/Navbar.ts
const { activeRoomId, activeRoomType } = useActiveRoom();
const upcomingMilestone = useUpcomingMilestone(activeRoomId, activeRoomType);
```

```ts
// src/components/logic/GlobalAppLogic.ts
useEmergencyRealtime(dashboard?.couple?.id, 'partner');
useEmergencyRealtime(dashboard?.cofCouple?.id, 'cof');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test src/context/activeRoomState.test.ts src/lib/roomParticipants.test.ts src/lib/roomDashboard.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/roomDashboard.ts src/lib/roomDashboard.test.ts src/components/AppLayout.tsx src/pages/logic/dashboard.ts src/pages/dashboard.tsx src/components/logic/Navbar.ts src/components/logic/GlobalAppLogic.ts
git commit -m "feat: make dashboard honor the active room"
```

### Task 4: Fix Love Notes To Use RoomId And RoomType End-To-End

**Files:**
- Create: `src/lib/loveNoteDraft.ts`
- Create: `src/lib/loveNoteDraft.test.ts`
- Modify: `src/pages/logic/love-notes.ts`
- Modify: `src/lib/cof.test.ts`

**Interfaces:**
- Consumes: `roomId`, `roomType`, `recipientId`, `title`, `body`, `openWhen`
- Produces:
  - `buildCreateLoveNoteInput(input: { roomId: string; roomType: CoupleType; recipientId?: string; title?: string; body: string; openWhen?: string }): CreateLoveNoteInput`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCreateLoveNoteInput } from './loveNoteDraft.ts';

test('buildCreateLoveNoteInput keeps roomId and roomType for a cof note', () => {
  assert.deepEqual(
    buildCreateLoveNoteInput({
      roomId: 'cof-1',
      roomType: 'cof',
      recipientId: 'user-2',
      title: 'Ping',
      body: 'Lunch later?',
      openWhen: 'after work',
    }),
    {
      roomId: 'cof-1',
      roomType: 'cof',
      recipient_id: 'user-2',
      title: 'Ping',
      body: 'Lunch later?',
      open_when: 'after work',
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test src/lib/loveNoteDraft.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/loveNoteDraft.ts`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/loveNoteDraft.ts
import type { CoupleType } from '@/types/database';
import type { CreateLoveNoteInput } from '@/hooks/useLoveNotes';

export function buildCreateLoveNoteInput(input: {
  roomId: string;
  roomType: CoupleType;
  recipientId?: string;
  title?: string;
  body: string;
  openWhen?: string;
}): CreateLoveNoteInput {
  return {
    roomId: input.roomId,
    roomType: input.roomType,
    recipient_id: input.recipientId,
    title: input.title,
    body: input.body,
    open_when: input.openWhen,
  };
}
```

```ts
// src/pages/logic/love-notes.ts
const { activeRoomId, activeRoomType } = useActiveRoom();
const { data: notes, isLoading } = useLoveNotes(activeRoomId, activeRoomType);
const { data: roomMembers = [] } = useRoomMembers(activeRoomId, activeRoomType);
const partnerMember = getPartnerMember(roomMembers, user?.id);
const partnerId = partnerMember?.user_id;
const partnerName = partnerMember?.profiles?.display_name || 'Partner';

await createNote.mutateAsync(
  buildCreateLoveNoteInput({
    roomId: activeRoomId,
    roomType: activeRoomType,
    recipientId: partnerId,
    title: title.trim() || undefined,
    body: body.trim(),
    openWhen: openWhen.trim() || undefined,
  }),
);
```

```ts
// src/lib/cof.test.ts
import { createCofRoom, joinCofRoom } from './cof.ts';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test src/context/activeRoomState.test.ts src/lib/roomParticipants.test.ts src/lib/roomDashboard.test.ts src/lib/loveNoteDraft.test.ts src/lib/cof.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/loveNoteDraft.ts src/lib/loveNoteDraft.test.ts src/pages/logic/love-notes.ts src/lib/cof.test.ts
git commit -m "feat: make love notes respect the active room"
```
