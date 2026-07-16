# Pre-Join Monthsary Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a partner-space creator save exactly one monthsary message before their partner joins, auto-attach it to the first joining partner, and deliver it even if the target monthsary date is already in the past when the partner joins.

**Architecture:** Keep the single `monthsary_messages` table and extend it with a pre-join draft state where `recipient_id` is `null`. Move join-time attachment into the `join_couple_by_code` database function so membership creation and draft assignment happen in the same transaction, then split authoring and delivery selection into separate pure helpers so the composer and popup can follow different rules cleanly.

**Tech Stack:** React 19, TypeScript, Wouter, TanStack Query, Supabase Postgres, Supabase Edge Functions, Node `node:test` via `npx tsx --test`

## Global Constraints

- Every Postgres schema change must go in a new migration file under `supabase/migrations/`; do not edit old migrations in place.
- This feature applies only to partner rooms.
- Still allow only one unresolved monthsary message at a time.
- Still target only the next upcoming monthsary when the message is first saved.
- Allow saving before the second partner joins.
- If the partner joins after the target date, let them see that previous unread message.
- The popup may close only after the recipient scrolls to the bottom and 10 seconds have elapsed.
- Do not introduce a separate `monthsary_message_drafts` table.
- Do not allow multiple queued future monthsary messages.

## File Structure

- `supabase/migrations/0014_prejoin_monthsary_drafts.sql`: relax `recipient_id`, narrow uniqueness to one unresolved row per couple, and replace `join_couple_by_code` so draft attachment happens in the same transaction as join.
- `src/types/database.ts`: make `MonthsaryMessage.recipient_id` nullable in the hand-written database types.
- `src/lib/monthsaryMessageDraft.ts`: keep authoring-specific pure helpers only: composer targeting, editable-message selection, and insert/update payload building.
- `src/lib/monthsaryMessageDraft.test.ts`: regression coverage for pre-join authoring behavior.
- `src/lib/monthsaryComposer.ts`: decide only whether the composer is available at all; it must no longer depend on `partnerId`.
- `src/lib/monthsaryComposer.test.ts`: regression coverage for the new pre-join availability rule.
- `src/hooks/useMonthsaryMessages.ts`: keep the couple-scoped unresolved-row query and mutations in sync with nullable `recipient_id`.
- `src/pages/logic/love-notes.ts`: save and edit the creator's unresolved monthsary row even before a partner exists.
- `src/pages/love-notes.tsx`: surface pre-join status copy without disabling the save flow.
- `src/lib/monthsaryMessageDelivery.ts`: pure overdue-delivery selection helper for popup logic.
- `src/lib/monthsaryMessageDelivery.test.ts`: regression coverage for due-message selection.
- `src/components/logic/MonthsaryMessageDialog.ts`: show any unread due message where `target_monthsary_date <= today`, not only exact-monthsary matches.

---

### Task 1: Add Pure Authoring Helpers For Pre-Join Drafts

**Files:**
- Modify: `src/lib/monthsaryMessageDraft.ts`
- Modify: `src/lib/monthsaryMessageDraft.test.ts`

**Interfaces:**
- Consumes:
  - `CoupleType`
  - `getNextUpcomingMonthsaryDate(relationshipStartDate: string, now?: Date): string`
- Produces:
  - `getMonthsaryComposerTarget(input: { roomType: CoupleType; relationshipStartDate: string | null; now?: Date }): string | null`
  - `findEditableMonthsaryMessage<T extends { created_by: string; completed_at: string | null }>(messages: T[], createdBy: string | null | undefined): T | null`
  - `buildMonthsaryMessageInput(input: { coupleId: string; recipientId?: string | null; title?: string; body: string; targetMonthsaryDate: string }): { couple_id: string; recipient_id: string | null; title: string | null; body: string; target_monthsary_date: string }`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMonthsaryMessageInput,
  findEditableMonthsaryMessage,
  getMonthsaryComposerTarget,
} from './monthsaryMessageDraft.ts';

test('getMonthsaryComposerTarget still returns the next monthsary only for partner rooms', () => {
  assert.equal(
    getMonthsaryComposerTarget({
      roomType: 'partner',
      relationshipStartDate: '2026-07-16',
      now: new Date(2026, 7, 1, 12, 0, 0),
    }),
    '2026-08-16',
  );

  assert.equal(
    getMonthsaryComposerTarget({
      roomType: 'cof',
      relationshipStartDate: '2026-07-16',
      now: new Date(2026, 7, 1, 12, 0, 0),
    }),
    null,
  );
});

test('findEditableMonthsaryMessage returns the creator draft even before a partner joins', () => {
  const match = findEditableMonthsaryMessage(
    [
      {
        id: 'mine',
        created_by: 'user-1',
        recipient_id: null,
        target_monthsary_date: '2026-08-16',
        completed_at: null,
      },
      {
        id: 'other',
        created_by: 'user-2',
        recipient_id: 'user-1',
        target_monthsary_date: '2026-08-16',
        completed_at: null,
      },
    ],
    'user-1',
  );

  assert.equal(match?.id, 'mine');
});

test('buildMonthsaryMessageInput keeps a null recipient for pre-join drafts', () => {
  assert.deepEqual(
    buildMonthsaryMessageInput({
      coupleId: 'couple-1',
      recipientId: null,
      title: '  Happy monthsary  ',
      body: '  Still here.  ',
      targetMonthsaryDate: '2026-08-16',
    }),
    {
      couple_id: 'couple-1',
      recipient_id: null,
      title: 'Happy monthsary',
      body: 'Still here.',
      target_monthsary_date: '2026-08-16',
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/monthsaryMessageDraft.test.ts`

Expected: FAIL because `findEditableMonthsaryMessage` is not exported yet and `buildMonthsaryMessageInput` still requires a non-null `recipientId`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/monthsaryMessageDraft.ts
import type { CoupleType } from '@/types/database';
import { getNextUpcomingMonthsaryDate } from './monthsaryDates.ts';

export function getMonthsaryComposerTarget(input: {
  roomType: CoupleType;
  relationshipStartDate: string | null;
  now?: Date;
}): string | null {
  if (input.roomType !== 'partner' || !input.relationshipStartDate) {
    return null;
  }

  return getNextUpcomingMonthsaryDate(input.relationshipStartDate, input.now);
}

export function findEditableMonthsaryMessage<
  T extends {
    created_by: string;
    completed_at: string | null;
  },
>(messages: T[], createdBy: string | null | undefined): T | null {
  if (!createdBy) {
    return null;
  }

  return (
    messages.find(
      (message) =>
        message.created_by === createdBy &&
        message.completed_at === null,
    ) ?? null
  );
}

export function buildMonthsaryMessageInput(input: {
  coupleId: string;
  recipientId?: string | null;
  title?: string;
  body: string;
  targetMonthsaryDate: string;
}) {
  return {
    couple_id: input.coupleId,
    recipient_id: input.recipientId ?? null,
    title: input.title?.trim() ? input.title.trim() : null,
    body: input.body.trim(),
    target_monthsary_date: input.targetMonthsaryDate,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/monthsaryMessageDraft.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/monthsaryMessageDraft.ts src/lib/monthsaryMessageDraft.test.ts
git commit -m "feat: add prejoin monthsary draft helpers"
```

### Task 2: Persist Pre-Join Drafts And Unblock The Composer

**Files:**
- Create: `supabase/migrations/0014_prejoin_monthsary_drafts.sql`
- Modify: `src/types/database.ts`
- Modify: `src/lib/monthsaryComposer.ts`
- Modify: `src/lib/monthsaryComposer.test.ts`
- Modify: `src/hooks/useMonthsaryMessages.ts`
- Modify: `src/pages/logic/love-notes.ts`
- Modify: `src/pages/love-notes.tsx`

**Interfaces:**
- Consumes:
  - `findEditableMonthsaryMessage(messages, createdBy): T | null`
  - `buildMonthsaryMessageInput(input): { couple_id: string; recipient_id: string | null; title: string | null; body: string; target_monthsary_date: string }`
- Produces:
  - `MonthsaryMessage['recipient_id']` as `string | null`
  - `getMonthsaryComposerBlocker(input: { roomType: CoupleType; relationshipStartDate: string | null }): string | null`
  - `useCreateMonthsaryMessage().mutateAsync(input: { couple_id: string; recipient_id: string | null; title: string | null; body: string; target_monthsary_date: string })`
  - `join_couple_by_code(code text)` that both inserts the second member and assigns unresolved pre-join drafts to `auth.uid()` in one transaction

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { getMonthsaryComposerBlocker } from './monthsaryComposer.ts';

test('getMonthsaryComposerBlocker still asks for the relationship start date first', () => {
  assert.equal(
    getMonthsaryComposerBlocker({
      roomType: 'partner',
      relationshipStartDate: null,
    }),
    'Add your relationship start date in Settings to unlock monthsary messages.',
  );
});

test('getMonthsaryComposerBlocker allows saving before a partner joins', () => {
  assert.equal(
    getMonthsaryComposerBlocker({
      roomType: 'partner',
      relationshipStartDate: '2026-07-16',
    }),
    null,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/monthsaryComposer.test.ts`

Expected: FAIL with a TypeScript error because `getMonthsaryComposerBlocker` still requires `partnerId`

- [ ] **Step 3: Write minimal implementation**

```sql
-- supabase/migrations/0014_prejoin_monthsary_drafts.sql
alter table monthsary_messages
  alter column recipient_id drop not null;

drop index if exists monthsary_messages_pending_unique;
create unique index if not exists monthsary_messages_pending_unique
  on monthsary_messages (couple_id)
  where completed_at is null;

drop policy if exists "monthsary_messages_insert_member" on monthsary_messages;
create policy "monthsary_messages_insert_member" on monthsary_messages
  for insert with check (
    created_by = auth.uid()
    and public.is_couple_member(couple_id)
    and (
      recipient_id is null
      or exists (
        select 1
        from couple_members
        where couple_members.couple_id = monthsary_messages.couple_id
          and couple_members.user_id = monthsary_messages.recipient_id
      )
    )
  );

create or replace function public.join_couple_by_code(code text)
returns table (couple_id uuid, couple_name text) as $$
declare
  target_couple couples%rowtype;
  member_count int;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into target_couple from couples where invite_code = code;

  if target_couple.id is null then
    raise exception 'INVALID_CODE';
  end if;

  if exists (
    select 1 from couple_members
    where user_id = auth.uid()
      and couple_type = target_couple.type
  ) then
    raise exception 'ALREADY_PAIRED';
  end if;

  select count(*) into member_count
  from couple_members
  where couple_members.couple_id = target_couple.id;

  if member_count >= 2 then
    raise exception 'COUPLE_FULL';
  end if;

  insert into couple_members (couple_id, user_id, role, couple_type)
  values (target_couple.id, auth.uid(), 'partner', target_couple.type);

  update monthsary_messages
  set recipient_id = auth.uid()
  where couple_id = target_couple.id
    and recipient_id is null
    and completed_at is null;

  return query select target_couple.id, target_couple.name;
end;
$$ language plpgsql security definer set search_path = public;
```

```ts
// src/types/database.ts
export interface MonthsaryMessage {
  id: string;
  couple_id: string;
  created_by: string;
  recipient_id: string | null;
  title: string | null;
  body: string;
  target_monthsary_date: string;
  completed_at: string | null;
  created_at: string;
}
```

```ts
// src/lib/monthsaryComposer.ts
import type { CoupleType } from '../types/database.ts';

export function getMonthsaryComposerBlocker(input: {
  roomType: CoupleType;
  relationshipStartDate: string | null;
}): string | null {
  if (input.roomType !== 'partner') {
    return 'Monthsary messages are only available in your partner space.';
  }

  if (!input.relationshipStartDate) {
    return 'Add your relationship start date in Settings to unlock monthsary messages.';
  }

  return null;
}
```

```ts
// src/hooks/useMonthsaryMessages.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { MonthsaryMessage } from '@/types/database';

export const monthsaryMessagesQueryKey = (coupleId: string | null) =>
  ['monthsary-messages', coupleId] as const;

export function useMonthsaryMessages(coupleId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: monthsaryMessagesQueryKey(coupleId ?? null),
    enabled: enabled && !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthsary_messages')
        .select('*')
        .eq('couple_id', coupleId!)
        .is('completed_at', null)
        .order('target_monthsary_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as MonthsaryMessage[];
    },
  });
}

export function useCreateMonthsaryMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      couple_id: string;
      recipient_id: string | null;
      title: string | null;
      body: string;
      target_monthsary_date: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('monthsary_messages')
        .insert({ ...input, created_by: userData.user.id })
        .select()
        .single();

      if (error) throw error;
      return data as MonthsaryMessage;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: monthsaryMessagesQueryKey(input.couple_id) });
    },
  });
}
```

```ts
// src/pages/logic/love-notes.ts
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useActiveRoom } from '@/context/ActiveRoomContext';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard, useCoupleRecord } from '@/hooks/useCouple';
import {
  useCreateMonthsaryMessage,
  useMonthsaryMessages,
  useUpdateMonthsaryMessage,
} from '@/hooks/useMonthsaryMessages';
import { getMonthsaryComposerBlocker } from '@/lib/monthsaryComposer';
import {
  buildMonthsaryMessageInput,
  findEditableMonthsaryMessage,
  getMonthsaryComposerTarget,
} from '@/lib/monthsaryMessageDraft';
import { resolveCurrentCouple } from '@/lib/coupleSource';
import { useRoomMembers } from '@/hooks/useRoomMembers';
import { getPartnerMember } from '@/lib/roomParticipants';

const { activeRoomId, activeRoomType } = useActiveRoom();
const { user } = useAuth();
const { data: dashboard } = useDashboard();
const { data: directCouple } = useCoupleRecord(
  activeRoomType === 'partner' ? activeRoomId : null,
);
const { data: roomMembers = [] } = useRoomMembers(activeRoomId, activeRoomType);

const currentCouple = resolveCurrentCouple({
  dashboardCouple: dashboard?.couple,
  directCouple,
});

const partnerMember = getPartnerMember(roomMembers, user?.id);
const partnerId = partnerMember?.user_id ?? null;
const relationshipStartDate =
  activeRoomType === 'partner' ? currentCouple?.relationship_start_date ?? null : null;

const monthsaryComposerBlocker = getMonthsaryComposerBlocker({
  roomType: activeRoomType,
  relationshipStartDate,
});

const computedTargetMonthsaryDate = getMonthsaryComposerTarget({
  roomType: activeRoomType,
  relationshipStartDate,
});

const { data: monthsaryMessages = [] } = useMonthsaryMessages(
  activeRoomType === 'partner' ? activeRoomId : null,
  activeRoomType === 'partner',
);

const editableMonthsaryMessage = findEditableMonthsaryMessage(
  monthsaryMessages,
  user?.id ?? null,
);

const targetMonthsaryDate =
  editableMonthsaryMessage?.target_monthsary_date ?? computedTargetMonthsaryDate;

useEffect(() => {
  setMonthsaryTitle(editableMonthsaryMessage?.title ?? '');
  setMonthsaryBody(editableMonthsaryMessage?.body ?? '');
}, [
  editableMonthsaryMessage?.id,
  editableMonthsaryMessage?.title,
  editableMonthsaryMessage?.body,
]);

async function handleMonthsarySubmit(e: React.FormEvent) {
  e.preventDefault();

  if (monthsaryComposerBlocker) {
    toast.error(monthsaryComposerBlocker);
    return;
  }

  if (!activeRoomId || !targetMonthsaryDate || !monthsaryBody.trim()) {
    return;
  }

  const recipientIdForSave =
    partnerId ?? editableMonthsaryMessage?.recipient_id ?? null;

  const payload = buildMonthsaryMessageInput({
    coupleId: activeRoomId,
    recipientId: recipientIdForSave,
    title: monthsaryTitle,
    body: monthsaryBody,
    targetMonthsaryDate,
  });

  if (editableMonthsaryMessage) {
    await updateMonthsaryMessage.mutateAsync({
      id: editableMonthsaryMessage.id,
      recipient_id: payload.recipient_id,
      title: payload.title,
      body: payload.body,
    });
    toast.success('Monthsary message updated');
  } else {
    await createMonthsaryMessage.mutateAsync(payload);
    toast.success(
      recipientIdForSave
        ? 'Monthsary message saved'
        : 'Monthsary message saved for your future partner',
    );
  }
}
```

```tsx
// src/pages/love-notes.tsx
const monthsaryStatusCopy =
  !relationshipStartDate || !targetMonthsaryDate
    ? 'Add your relationship start date in Settings to unlock monthsary messages.'
    : partnerId
      ? `This message targets ${format(new Date(`${targetMonthsaryDate}T12:00:00`), 'MMMM d, yyyy')}. If that date has already passed, your partner will see it the next time they open the app.`
      : `This message targets ${format(new Date(`${targetMonthsaryDate}T12:00:00`), 'MMMM d, yyyy')}. It will be assigned to the first partner who joins this space, and if that date has already passed they will see it right away.`;

<p className="text-sm text-muted-foreground">{monthsaryStatusCopy}</p>

<Button
  type="submit"
  className="bg-primary hover:bg-primary/90 text-primary-foreground"
  disabled={
    !!monthsaryComposerBlocker ||
    createMonthsaryMessage.isPending ||
    updateMonthsaryMessage.isPending
  }
>
  {editableMonthsaryMessage ? 'Update Monthsary Message' : 'Save Monthsary Message'}
</Button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/monthsaryComposer.test.ts src/lib/monthsaryMessageDraft.test.ts`

Run: `npm run typecheck`

Expected: both commands exit `0`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0014_prejoin_monthsary_drafts.sql src/types/database.ts src/lib/monthsaryComposer.ts src/lib/monthsaryComposer.test.ts src/hooks/useMonthsaryMessages.ts src/pages/logic/love-notes.ts src/pages/love-notes.tsx
git commit -m "feat: support prejoin monthsary drafts"
```

### Task 3: Deliver Any Due Unread Monthsary Message In The Global Popup

**Files:**
- Create: `src/lib/monthsaryMessageDelivery.ts`
- Create: `src/lib/monthsaryMessageDelivery.test.ts`
- Modify: `src/components/logic/MonthsaryMessageDialog.ts`

**Interfaces:**
- Consumes:
  - `toLocalDateKey(date: Date): string`
  - `MonthsaryMessage[]`
- Produces:
  - `findDueMonthsaryMessage<T extends { recipient_id: string | null; target_monthsary_date: string; completed_at: string | null; created_at: string }>(messages: T[], recipientId: string | null | undefined, now?: Date): T | null`
  - `useMonthsaryMessageDialogLogic()` that no longer requires `relationship_start_date` or exact-monthsary matching before checking for delivery

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { findDueMonthsaryMessage } from './monthsaryMessageDelivery.ts';

test('findDueMonthsaryMessage ignores future rows and picks an overdue unread row', () => {
  const match = findDueMonthsaryMessage(
    [
      {
        id: 'future',
        recipient_id: 'user-2',
        target_monthsary_date: '2026-08-16',
        completed_at: null,
        created_at: '2026-07-16T02:00:00.000Z',
      },
      {
        id: 'overdue',
        recipient_id: 'user-2',
        target_monthsary_date: '2026-07-16',
        completed_at: null,
        created_at: '2026-07-16T01:00:00.000Z',
      },
    ],
    'user-2',
    new Date(2026, 7, 20, 12, 0, 0),
  );

  assert.equal(match?.id, 'overdue');
});

test('findDueMonthsaryMessage picks the oldest due unread row if legacy data has more than one', () => {
  const match = findDueMonthsaryMessage(
    [
      {
        id: 'older',
        recipient_id: 'user-2',
        target_monthsary_date: '2026-06-16',
        completed_at: null,
        created_at: '2026-06-16T01:00:00.000Z',
      },
      {
        id: 'newer',
        recipient_id: 'user-2',
        target_monthsary_date: '2026-07-16',
        completed_at: null,
        created_at: '2026-07-16T01:00:00.000Z',
      },
    ],
    'user-2',
    new Date(2026, 7, 20, 12, 0, 0),
  );

  assert.equal(match?.id, 'older');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/monthsaryMessageDelivery.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/monthsaryMessageDelivery.ts`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/monthsaryMessageDelivery.ts
import { toLocalDateKey } from './monthsaryDates.ts';

export function findDueMonthsaryMessage<
  T extends {
    recipient_id: string | null;
    target_monthsary_date: string;
    completed_at: string | null;
    created_at: string;
  },
>(messages: T[], recipientId: string | null | undefined, now = new Date()): T | null {
  if (!recipientId) {
    return null;
  }

  const todayKey = toLocalDateKey(now);

  return (
    [...messages]
      .filter(
        (message) =>
          message.recipient_id === recipientId &&
          message.completed_at === null &&
          message.target_monthsary_date <= todayKey,
      )
      .sort(
        (left, right) =>
          left.target_monthsary_date.localeCompare(right.target_monthsary_date) ||
          left.created_at.localeCompare(right.created_at),
      )[0] ?? null
  );
}
```

```ts
// src/components/logic/MonthsaryMessageDialog.ts
import { useEffect, useMemo, useState, type UIEvent } from 'react';
import { toast } from 'sonner';
import { useActiveRoom } from '@/context/ActiveRoomContext';
import { useAuth } from '@/hooks/useAuth';
import {
  useCompleteMonthsaryMessage,
  useMonthsaryMessages,
} from '@/hooks/useMonthsaryMessages';
import { findDueMonthsaryMessage } from '@/lib/monthsaryMessageDelivery';
import { canDismissMonthsaryMessage } from '@/lib/monthsaryMessageState';
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `$tests = @(rg --files -g '*.test.ts' src); $tests += 'capacitor.config.test.ts'; npx tsx --test $tests`

Run: `npm run typecheck`

Run: `npm run build`

Expected: all commands exit `0`

- [ ] **Step 5: Commit**

```bash
git add src/lib/monthsaryMessageDelivery.ts src/lib/monthsaryMessageDelivery.test.ts src/components/logic/MonthsaryMessageDialog.ts
git commit -m "feat: deliver overdue monthsary messages after join"
```
