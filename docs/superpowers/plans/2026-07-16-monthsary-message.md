# Monthsary Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one partner write a message for the next upcoming monthsary and have the recipient see it in a blocking popup on the monthsary date.

**Architecture:** Add a dedicated `monthsary_messages` table plus `relationship_start_date` on partner couples, expose the new couple field through existing dashboard/couple contracts, keep the authoring UI separate from ordinary love notes, and mount a global monthsary dialog that stays locked until the reader has scrolled to the bottom and waited 10 seconds.

**Tech Stack:** React 19, TypeScript, Wouter, TanStack Query, Supabase Postgres, Supabase Edge Functions, Node `node:test` via `npx tsx --test`

## Global Constraints

- Every Postgres schema change must go in a new migration file under `supabase/migrations/`; do not edit old migrations in place.
- This feature applies only to partner rooms.
- The source of truth for recurrence is `couples.relationship_start_date`.
- Authoring targets only the next upcoming monthsary; do not add arbitrary month scheduling.
- The popup may close only after the recipient scrolls to the bottom and 10 seconds have elapsed.
- Ordinary love notes must keep their current behavior.
- Global monthsary checks must not trigger unauthenticated dashboard queries on public routes.
- Add regression coverage before production code for each new pure logic boundary.

## File Structure

- `supabase/migrations/0013_monthsary_messages.sql`: add `relationship_start_date`, create `monthsary_messages`, add indexes and RLS policies.
- `supabase/functions/create-couple/index.ts`: require and persist the partner relationship start date.
- `supabase/functions/dashboard-summary/index.ts`: include `relationship_start_date` in the partner couple payload.
- `src/lib/monthsaryDates.ts`: pure local-date scheduling helpers for monthsary recurrence.
- `src/lib/coupleDraft.ts`: map onboarding/settings inputs into the backend payload shape.
- `src/hooks/useMonthsaryMessages.ts`: query and mutate the new `monthsary_messages` table.
- `src/lib/monthsaryMessageDraft.ts`: keep composer targeting and pending-message selection out of page components.
- `src/components/MonthsaryMessageDialog.tsx`: global blocking popup UI.
- `src/components/logic/MonthsaryMessageDialog.ts`: timer, scroll, completion, and due-message selection logic.

---

### Task 1: Add Pure Monthsary Date Utilities

**Files:**
- Create: `src/lib/monthsaryDates.ts`
- Create: `src/lib/monthsaryDates.test.ts`

**Interfaces:**
- Produces:
  - `toLocalDateKey(date: Date): string`
  - `getNextUpcomingMonthsaryDate(relationshipStartDate: string, now?: Date): string`
  - `isMonthsaryDate(relationshipStartDate: string, now?: Date): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getNextUpcomingMonthsaryDate,
  isMonthsaryDate,
  toLocalDateKey,
} from './monthsaryDates.ts';

test('toLocalDateKey formats a Date in local calendar terms', () => {
  assert.equal(toLocalDateKey(new Date(2026, 6, 16, 12, 0, 0)), '2026-07-16');
});

test('getNextUpcomingMonthsaryDate keeps the current day when today is monthsary', () => {
  assert.equal(
    getNextUpcomingMonthsaryDate('2026-01-16', new Date(2026, 6, 16, 9, 30, 0)),
    '2026-07-16',
  );
});

test('getNextUpcomingMonthsaryDate moves to the next month after the day passes', () => {
  assert.equal(
    getNextUpcomingMonthsaryDate('2026-01-16', new Date(2026, 6, 17, 9, 30, 0)),
    '2026-08-16',
  );
});

test('getNextUpcomingMonthsaryDate falls back to the last day of a shorter month', () => {
  assert.equal(
    getNextUpcomingMonthsaryDate('2026-01-31', new Date(2026, 1, 10, 12, 0, 0)),
    '2026-02-28',
  );
});

test('isMonthsaryDate uses local calendar day matching', () => {
  assert.equal(isMonthsaryDate('2026-01-31', new Date(2026, 3, 30, 8, 0, 0)), true);
  assert.equal(isMonthsaryDate('2026-01-31', new Date(2026, 3, 29, 8, 0, 0)), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/monthsaryDates.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/monthsaryDates.ts`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/monthsaryDates.ts
function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month, day };
}

function getLastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function buildMonthsaryDate(
  relationshipStartDate: string,
  year: number,
  monthIndex: number,
): Date {
  const { day } = parseDateKey(relationshipStartDate);
  const actualDay = Math.min(day, getLastDayOfMonth(year, monthIndex));
  return new Date(year, monthIndex, actualDay, 12, 0, 0, 0);
}

export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getNextUpcomingMonthsaryDate(
  relationshipStartDate: string,
  now = new Date(),
): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const currentMonthCandidate = buildMonthsaryDate(
    relationshipStartDate,
    today.getFullYear(),
    today.getMonth(),
  );

  if (currentMonthCandidate.getTime() >= today.getTime()) {
    return toLocalDateKey(currentMonthCandidate);
  }

  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1, 12, 0, 0, 0);
  return toLocalDateKey(
    buildMonthsaryDate(relationshipStartDate, nextMonth.getFullYear(), nextMonth.getMonth()),
  );
}

export function isMonthsaryDate(relationshipStartDate: string, now = new Date()): boolean {
  return getNextUpcomingMonthsaryDate(relationshipStartDate, now) === toLocalDateKey(now);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/monthsaryDates.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/monthsaryDates.ts src/lib/monthsaryDates.test.ts
git commit -m "feat: add monthsary date utilities"
```

### Task 2: Wire Relationship Start Date Through Supabase, Onboarding, And Settings

**Files:**
- Create: `supabase/migrations/0013_monthsary_messages.sql`
- Create: `src/lib/coupleDraft.ts`
- Create: `src/lib/coupleDraft.test.ts`
- Modify: `supabase/functions/create-couple/index.ts`
- Modify: `supabase/functions/dashboard-summary/index.ts`
- Modify: `src/types/database.ts`
- Modify: `src/hooks/useCouple.ts`
- Modify: `src/pages/logic/onboarding.ts`
- Modify: `src/pages/onboarding.tsx`
- Modify: `src/pages/logic/settings.ts`
- Modify: `src/pages/settings.tsx`

**Interfaces:**
- Consumes: `Couple`, `DashboardSummary`, `relationship_start_date`, `create-couple` edge function
- Produces:
  - `buildCreateCoupleInput(input: { name: string; relationshipStartDate: string }): { name: string; relationshipStartDate: string }`
  - `buildUpdateCouplePatch(input: { name?: string; relationshipStartDate?: string }): { name?: string; relationship_start_date?: string }`
  - `useCreateCouple().mutateAsync({ name, relationshipStartDate })`
  - `useUpdateCouple().mutateAsync({ coupleId, name?, relationshipStartDate? })`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCreateCoupleInput, buildUpdateCouplePatch } from './coupleDraft.ts';

test('buildCreateCoupleInput trims the name and keeps the relationship start date', () => {
  assert.deepEqual(
    buildCreateCoupleInput({
      name: '  Home Base  ',
      relationshipStartDate: '2026-07-16',
    }),
    {
      name: 'Home Base',
      relationshipStartDate: '2026-07-16',
    },
  );
});

test('buildUpdateCouplePatch maps relationshipStartDate to relationship_start_date', () => {
  assert.deepEqual(
    buildUpdateCouplePatch({
      name: '  Shared Space  ',
      relationshipStartDate: '2026-07-16',
    }),
    {
      name: 'Shared Space',
      relationship_start_date: '2026-07-16',
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/coupleDraft.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/coupleDraft.ts`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/coupleDraft.ts
export function buildCreateCoupleInput(input: {
  name: string;
  relationshipStartDate: string;
}) {
  return {
    name: input.name.trim(),
    relationshipStartDate: input.relationshipStartDate,
  };
}

export function buildUpdateCouplePatch(input: {
  name?: string;
  relationshipStartDate?: string;
}) {
  const patch: { name?: string; relationship_start_date?: string } = {};

  if (input.name?.trim()) {
    patch.name = input.name.trim();
  }

  if (input.relationshipStartDate) {
    patch.relationship_start_date = input.relationshipStartDate;
  }

  return patch;
}
```

```sql
-- supabase/migrations/0013_monthsary_messages.sql
alter table couples
  add column if not exists relationship_start_date date;

create table if not exists monthsary_messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  title text,
  body text not null,
  target_monthsary_date date not null,
  completed_at timestamptz,
  created_at timestamptz default now(),
  check (recipient_id <> created_by)
);

create unique index if not exists monthsary_messages_pending_unique
  on monthsary_messages (couple_id, recipient_id, target_monthsary_date)
  where completed_at is null;

alter table monthsary_messages enable row level security;

drop policy if exists "monthsary_messages_select_member" on monthsary_messages;
create policy "monthsary_messages_select_member" on monthsary_messages
  for select using (public.is_couple_member(couple_id));

drop policy if exists "monthsary_messages_insert_member" on monthsary_messages;
create policy "monthsary_messages_insert_member" on monthsary_messages
  for insert with check (
    created_by = auth.uid()
    and public.is_couple_member(couple_id)
    and exists (
      select 1
      from couple_members
      where couple_members.couple_id = monthsary_messages.couple_id
        and couple_members.user_id = monthsary_messages.recipient_id
    )
  );

drop policy if exists "monthsary_messages_update_member" on monthsary_messages;
create policy "monthsary_messages_update_member" on monthsary_messages
  for update using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));
```

```ts
// src/types/database.ts
export interface Couple {
  id: string;
  name: string;
  invite_code: string | null;
  created_by: string;
  relationship_start_date: string | null;
  created_at: string;
}

export interface MonthsaryMessage {
  id: string;
  couple_id: string;
  created_by: string;
  recipient_id: string;
  title: string | null;
  body: string;
  target_monthsary_date: string;
  completed_at: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      couples: { Row: Couple; Insert: Partial<Couple>; Update: Partial<Couple> };
      monthsary_messages: {
        Row: MonthsaryMessage;
        Insert: Partial<MonthsaryMessage>;
        Update: Partial<MonthsaryMessage>;
      };
    };
  };
}
```

```ts
// src/hooks/useCouple.ts
import { buildUpdateCouplePatch } from '@/lib/coupleDraft';

export function useCreateCouple() {
  return useMutation({
    mutationFn: ({ name, relationshipStartDate }: { name: string; relationshipStartDate: string }) =>
      invokeEdgeFunction<{ couple: Couple }>('create-couple', {
        name,
        relationshipStartDate,
      }),
  });
}

export function useUpdateCouple() {
  return useMutation({
    mutationFn: async ({
      coupleId,
      name,
      relationshipStartDate,
    }: {
      coupleId: string;
      name?: string;
      relationshipStartDate?: string;
    }) => {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('couples')
        .update(buildUpdateCouplePatch({ name, relationshipStartDate }))
        .eq('id', coupleId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });
}
```

```ts
// supabase/functions/create-couple/index.ts
const { name, relationshipStartDate } = body;

if (!name || typeof name !== 'string') {
  return errorResponse('name is required');
}

if (!relationshipStartDate || typeof relationshipStartDate !== 'string') {
  return errorResponse('relationshipStartDate is required');
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(relationshipStartDate)) {
  return errorResponse('relationshipStartDate must be YYYY-MM-DD');
}

const { data: couple, error: coupleError } = await admin
  .from('couples')
  .insert({
    name,
    invite_code: inviteCode,
    created_by: user.id,
    relationship_start_date: relationshipStartDate,
  })
  .select()
  .single();
```

```ts
// supabase/functions/dashboard-summary/index.ts
.select('couple_id, couples(id, name, invite_code, created_by, relationship_start_date, created_at)')
```

```ts
// src/pages/logic/onboarding.ts
import { buildCreateCoupleInput } from '@/lib/coupleDraft';

const [relationshipStartDate, setRelationshipStartDate] = useState('');

async function handleCreate(e: React.FormEvent) {
  e.preventDefault();
  if (!coupleName.trim()) return;

  if (!hasPartnerCouple && !relationshipStartDate) {
    toast.error('Please choose your relationship start date');
    return;
  }

  if (hasPartnerCouple) {
    const res = await createCof.mutateAsync({ name: coupleName });
    setCreatedInviteCode(res.cof.invite_code);
  } else {
    const res = await createCouple.mutateAsync(
      buildCreateCoupleInput({
        name: coupleName,
        relationshipStartDate,
      }),
    );
    setCreatedInviteCode(res.couple.invite_code);
  }
}

return {
  relationshipStartDate,
  setRelationshipStartDate,
  // existing return values...
};
```

```tsx
// src/pages/onboarding.tsx
const {
  relationshipStartDate,
  setRelationshipStartDate,
  // existing values...
} = useOnboardingLogic();

<div className="space-y-2">
  <Label htmlFor="relationshipStartDate">Relationship start date</Label>
  <Input
    id="relationshipStartDate"
    type="date"
    value={relationshipStartDate}
    onChange={(e) => setRelationshipStartDate(e.target.value)}
    required
  />
  <p className="text-xs text-muted-foreground">
    This date is used to calculate your recurring monthsary.
  </p>
</div>
```

```ts
// src/pages/logic/settings.ts
const [isEditingRelationshipStartDate, setIsEditingRelationshipStartDate] = useState(false);
const [relationshipStartDateDraft, setRelationshipStartDateDraft] = useState('');

useEffect(() => {
  setRelationshipStartDateDraft(couple?.relationship_start_date ?? '');
}, [couple?.relationship_start_date]);

const handleSaveRelationshipStartDate = () => {
  if (!couple || !relationshipStartDateDraft) {
    setIsEditingRelationshipStartDate(false);
    return;
  }

  updateCouple.mutate(
    {
      coupleId: couple.id,
      relationshipStartDate: relationshipStartDateDraft,
    },
    {
      onSuccess: () => setIsEditingRelationshipStartDate(false),
    },
  );
};

return {
  isEditingRelationshipStartDate,
  setIsEditingRelationshipStartDate,
  relationshipStartDateDraft,
  setRelationshipStartDateDraft,
  handleSaveRelationshipStartDate,
  // existing values...
};
```

```tsx
// src/pages/settings.tsx
const {
  isEditingRelationshipStartDate,
  setIsEditingRelationshipStartDate,
  relationshipStartDateDraft,
  setRelationshipStartDateDraft,
  handleSaveRelationshipStartDate,
  // existing values...
} = useSettingsLogic();

<div className="space-y-1">
  <p className="text-sm font-medium text-muted-foreground">Relationship Start Date</p>
  {isEditingRelationshipStartDate ? (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        value={relationshipStartDateDraft}
        onChange={(e) => setRelationshipStartDateDraft(e.target.value)}
        className="max-w-[250px]"
      />
      <Button size="icon" variant="ghost" onClick={handleSaveRelationshipStartDate}>
        <Check className="w-4 h-4 text-green-500" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setIsEditingRelationshipStartDate(false)}
      >
        <X className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <p className="text-lg">
        {couple.relationship_start_date
          ? format(new Date(`${couple.relationship_start_date}T12:00:00`), 'MMMM d, yyyy')
          : 'Not set'}
      </p>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => setIsEditingRelationshipStartDate(true)}
      >
        <Edit2 className="w-4 h-4" />
      </Button>
    </div>
  )}
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/monthsaryDates.test.ts src/lib/coupleDraft.test.ts`

Run: `npm run typecheck`

Expected: both commands exit `0`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0013_monthsary_messages.sql supabase/functions/create-couple/index.ts supabase/functions/dashboard-summary/index.ts src/lib/coupleDraft.ts src/lib/coupleDraft.test.ts src/types/database.ts src/hooks/useCouple.ts src/pages/logic/onboarding.ts src/pages/onboarding.tsx src/pages/logic/settings.ts src/pages/settings.tsx
git commit -m "feat: add relationship start date contracts"
```

### Task 3: Add Monthsary Message Data Access And Composer UI

**Files:**
- Create: `src/hooks/useMonthsaryMessages.ts`
- Create: `src/lib/monthsaryMessageDraft.ts`
- Create: `src/lib/monthsaryMessageDraft.test.ts`
- Modify: `src/pages/logic/love-notes.ts`
- Modify: `src/pages/love-notes.tsx`

**Interfaces:**
- Consumes: `MonthsaryMessage`, `CoupleType`, `relationship_start_date`, `partnerId`
- Produces:
  - `useMonthsaryMessages(coupleId: string | null | undefined, enabled?: boolean)`
  - `useCreateMonthsaryMessage()`
  - `useUpdateMonthsaryMessage()`
  - `useCompleteMonthsaryMessage()`
  - `getMonthsaryComposerTarget(input: { roomType: CoupleType; relationshipStartDate: string | null; now?: Date }): string | null`
  - `findPendingMonthsaryMessage<T extends { recipient_id: string | null; target_monthsary_date: string; completed_at: string | null }>(messages: T[], recipientId: string | null | undefined, targetDate: string | null): T | null`
  - `buildMonthsaryMessageInput(input: { coupleId: string; recipientId: string; title?: string; body: string; targetMonthsaryDate: string }): { couple_id: string; recipient_id: string; title?: string | null; body: string; target_monthsary_date: string }`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMonthsaryMessageInput,
  findPendingMonthsaryMessage,
  getMonthsaryComposerTarget,
} from './monthsaryMessageDraft.ts';

test('getMonthsaryComposerTarget returns the next monthsary only for partner rooms', () => {
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

test('findPendingMonthsaryMessage picks the unread message for the matching recipient and date', () => {
  const match = findPendingMonthsaryMessage(
    [
      {
        id: 'done',
        recipient_id: 'user-2',
        target_monthsary_date: '2026-08-16',
        completed_at: '2026-08-16T01:00:00.000Z',
      },
      {
        id: 'pending',
        recipient_id: 'user-2',
        target_monthsary_date: '2026-08-16',
        completed_at: null,
      },
    ],
    'user-2',
    '2026-08-16',
  );

  assert.equal(match?.id, 'pending');
});

test('buildMonthsaryMessageInput maps the composer payload to table columns', () => {
  assert.deepEqual(
    buildMonthsaryMessageInput({
      coupleId: 'couple-1',
      recipientId: 'user-2',
      title: '  Happy monthsary  ',
      body: '  Thanks for being here.  ',
      targetMonthsaryDate: '2026-08-16',
    }),
    {
      couple_id: 'couple-1',
      recipient_id: 'user-2',
      title: 'Happy monthsary',
      body: 'Thanks for being here.',
      target_monthsary_date: '2026-08-16',
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/monthsaryMessageDraft.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/monthsaryMessageDraft.ts`

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

export function findPendingMonthsaryMessage<
  T extends {
    recipient_id: string | null;
    target_monthsary_date: string;
    completed_at: string | null;
  },
>(messages: T[], recipientId: string | null | undefined, targetDate: string | null): T | null {
  if (!recipientId || !targetDate) {
    return null;
  }

  return (
    messages.find(
      (message) =>
        message.recipient_id === recipientId &&
        message.target_monthsary_date === targetDate &&
        message.completed_at === null,
    ) ?? null
  );
}

export function buildMonthsaryMessageInput(input: {
  coupleId: string;
  recipientId: string;
  title?: string;
  body: string;
  targetMonthsaryDate: string;
}) {
  return {
    couple_id: input.coupleId,
    recipient_id: input.recipientId,
    title: input.title?.trim() ? input.title.trim() : null,
    body: input.body.trim(),
    target_monthsary_date: input.targetMonthsaryDate,
  };
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
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MonthsaryMessage[];
    },
  });
}

export function useCreateMonthsaryMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<MonthsaryMessage, 'id' | 'created_by' | 'completed_at' | 'created_at'> & { title: string | null }) => {
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

export function useUpdateMonthsaryMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MonthsaryMessage> & { id: string }) => {
      const { data, error } = await supabase
        .from('monthsary_messages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as MonthsaryMessage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: monthsaryMessagesQueryKey(data.couple_id) });
    },
  });
}

export function useCompleteMonthsaryMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completedAt }: { id: string; completedAt: string }) => {
      const { data, error } = await supabase
        .from('monthsary_messages')
        .update({ completed_at: completedAt })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as MonthsaryMessage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: monthsaryMessagesQueryKey(data.couple_id) });
    },
  });
}
```

```ts
// src/pages/logic/love-notes.ts
import { useDashboard } from '@/hooks/useCouple';
import {
  useCreateMonthsaryMessage,
  useMonthsaryMessages,
  useUpdateMonthsaryMessage,
} from '@/hooks/useMonthsaryMessages';
import {
  buildMonthsaryMessageInput,
  findPendingMonthsaryMessage,
  getMonthsaryComposerTarget,
} from '@/lib/monthsaryMessageDraft';

const { data: dashboard } = useDashboard();
const relationshipStartDate =
  activeRoomType === 'partner' ? dashboard?.couple?.relationship_start_date ?? null : null;

const [monthsaryTitle, setMonthsaryTitle] = useState('');
const [monthsaryBody, setMonthsaryBody] = useState('');

const targetMonthsaryDate = getMonthsaryComposerTarget({
  roomType: activeRoomType,
  relationshipStartDate,
});

const { data: monthsaryMessages = [] } = useMonthsaryMessages(
  activeRoomType === 'partner' ? activeRoomId : null,
  activeRoomType === 'partner',
);

const createMonthsaryMessage = useCreateMonthsaryMessage();
const updateMonthsaryMessage = useUpdateMonthsaryMessage();

const pendingMonthsaryMessage = findPendingMonthsaryMessage(
  monthsaryMessages,
  partnerId,
  targetMonthsaryDate,
);

async function handleMonthsarySubmit(e: React.FormEvent) {
  e.preventDefault();

  if (
    activeRoomType !== 'partner' ||
    !activeRoomId ||
    !partnerId ||
    !targetMonthsaryDate ||
    !monthsaryBody.trim()
  ) {
    return;
  }

  const payload = buildMonthsaryMessageInput({
    coupleId: activeRoomId,
    recipientId: partnerId,
    title: monthsaryTitle,
    body: monthsaryBody,
    targetMonthsaryDate,
  });

  if (pendingMonthsaryMessage) {
    await updateMonthsaryMessage.mutateAsync({
      id: pendingMonthsaryMessage.id,
      title: payload.title,
      body: payload.body,
    });
    toast.success('Monthsary message updated');
  } else {
    await createMonthsaryMessage.mutateAsync(payload);
    toast.success('Monthsary message saved');
  }
}

return {
  relationshipStartDate,
  targetMonthsaryDate,
  monthsaryTitle,
  setMonthsaryTitle,
  monthsaryBody,
  setMonthsaryBody,
  pendingMonthsaryMessage,
  createMonthsaryMessage,
  updateMonthsaryMessage,
  handleMonthsarySubmit,
  // existing return values...
};
```

```tsx
// src/pages/love-notes.tsx
const {
  relationshipStartDate,
  targetMonthsaryDate,
  monthsaryTitle,
  setMonthsaryTitle,
  monthsaryBody,
  setMonthsaryBody,
  pendingMonthsaryMessage,
  createMonthsaryMessage,
  updateMonthsaryMessage,
  handleMonthsarySubmit,
  // existing values...
} = useLoveNotesLogic();

{activeRoomType === 'partner' && (
  <Card className="border-primary/20 bg-primary/5 shadow-md">
    <CardHeader>
      <CardTitle className="font-serif text-primary">Next Monthsary Message</CardTitle>
      <p className="text-sm text-muted-foreground">
        {relationshipStartDate && targetMonthsaryDate
          ? `This message will open on ${format(new Date(`${targetMonthsaryDate}T12:00:00`), 'MMMM d, yyyy')}.`
          : 'Add your relationship start date in Settings to unlock monthsary messages.'}
      </p>
    </CardHeader>
    <CardContent>
      {relationshipStartDate && targetMonthsaryDate ? (
        <form onSubmit={handleMonthsarySubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input
              placeholder="Happy monthsary"
              value={monthsaryTitle}
              onChange={(e) => setMonthsaryTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={monthsaryBody}
              onChange={(e) => setMonthsaryBody(e.target.value)}
              className="min-h-[160px] resize-none font-serif text-lg leading-relaxed"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={createMonthsaryMessage.isPending || updateMonthsaryMessage.isPending}
          >
            {pendingMonthsaryMessage ? 'Update Monthsary Message' : 'Save Monthsary Message'}
          </Button>
        </form>
      ) : null}
    </CardContent>
  </Card>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/monthsaryDates.test.ts src/lib/coupleDraft.test.ts src/lib/monthsaryMessageDraft.test.ts`

Run: `npm run typecheck`

Expected: both commands exit `0`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMonthsaryMessages.ts src/lib/monthsaryMessageDraft.ts src/lib/monthsaryMessageDraft.test.ts src/pages/logic/love-notes.ts src/pages/love-notes.tsx
git commit -m "feat: add monthsary message composer"
```

### Task 4: Add The Global Blocking Popup And App-Level Provider Wiring

**Files:**
- Create: `src/components/MonthsaryMessageDialog.tsx`
- Create: `src/components/logic/MonthsaryMessageDialog.ts`
- Create: `src/lib/monthsaryMessageState.ts`
- Create: `src/lib/monthsaryMessageState.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/AppLayout.tsx`
- Modify: `src/components/GlobalAppLogic.tsx`
- Modify: `src/context/ActiveRoomContext.tsx`

**Interfaces:**
- Consumes: `activeRoomType`, `activeRoomId`, `user`, `relationship_start_date`, `MonthsaryMessage[]`
- Produces:
  - `canDismissMonthsaryMessage(input: { openedAt: number | null; now: number; hasReachedBottom: boolean; minimumMs?: number }): boolean`
  - `useMonthsaryMessageDialogLogic(): { activeMessage: MonthsaryMessage | null; canClose: boolean; isCompleting: boolean; errorMessage: string | null; hasReachedBottom: boolean; secondsRemaining: number; handleScroll(event: React.UIEvent<HTMLDivElement>): void; handleClose(): Promise<void> }`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { canDismissMonthsaryMessage } from './monthsaryMessageState.ts';

test('canDismissMonthsaryMessage stays locked before ten seconds', () => {
  assert.equal(
    canDismissMonthsaryMessage({
      openedAt: 0,
      now: 9_000,
      hasReachedBottom: true,
    }),
    false,
  );
});

test('canDismissMonthsaryMessage stays locked until the user reaches the bottom', () => {
  assert.equal(
    canDismissMonthsaryMessage({
      openedAt: 0,
      now: 12_000,
      hasReachedBottom: false,
    }),
    false,
  );
});

test('canDismissMonthsaryMessage unlocks only after both conditions are met', () => {
  assert.equal(
    canDismissMonthsaryMessage({
      openedAt: 0,
      now: 12_000,
      hasReachedBottom: true,
    }),
    true,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/monthsaryMessageState.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/monthsaryMessageState.ts`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/monthsaryMessageState.ts
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
```

```tsx
// src/App.tsx
import { ActiveRoomProvider } from '@/context/ActiveRoomContext';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TutorialProvider>
          <TooltipProvider>
            <ActiveRoomProvider>
              <GlobalAppLogic />
              <WouterRouter
                base={
                  import.meta.env.BASE_URL === './' || import.meta.env.BASE_URL === '.'
                    ? ''
                    : import.meta.env.BASE_URL.replace(/\/$/, '')
                }
              >
                <Router />
              </WouterRouter>
            </ActiveRoomProvider>
            <Toaster />
            <SonnerToaster position="top-center" richColors />
          </TooltipProvider>
        </TutorialProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

```tsx
// src/components/AppLayout.tsx
export function AppLayout({ children }: { children: ReactNode }) {
  return <AppLayoutFrame>{children}</AppLayoutFrame>;
}
```

```ts
// src/context/ActiveRoomContext.tsx
import { useAuth } from '@/hooks/useAuth';

export function ActiveRoomProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard(!!user);
  const { data: directRooms, isLoading: directRoomsLoading } = useMyRooms(!!user);

  const switchRoom = (type: CoupleType) => {
    setActiveType(type);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(ACTIVE_ROOM_SESSION_KEY, type);
    }
  };

  // existing provider logic...
}
```

```tsx
// src/components/GlobalAppLogic.tsx
import { MonthsaryMessageDialog } from './MonthsaryMessageDialog';

export function GlobalAppLogic() {
  const { user } = useGlobalAppLogic();
  usePushNotifications();
  useNetworkSync();

  if (!user) return null;

  return (
    <>
      <GlobalEmergencyAlert />
      <MonthsaryMessageDialog />
    </>
  );
}
```

```ts
// src/components/logic/MonthsaryMessageDialog.ts
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useActiveRoom } from '@/context/ActiveRoomContext';
import { useDashboard } from '@/hooks/useCouple';
import { useAuth } from '@/hooks/useAuth';
import {
  useCompleteMonthsaryMessage,
  useMonthsaryMessages,
} from '@/hooks/useMonthsaryMessages';
import { findPendingMonthsaryMessage } from '@/lib/monthsaryMessageDraft';
import { canDismissMonthsaryMessage } from '@/lib/monthsaryMessageState';
import { isMonthsaryDate, toLocalDateKey } from '@/lib/monthsaryDates';

export function useMonthsaryMessageDialogLogic() {
  const { user } = useAuth();
  const { data: dashboard } = useDashboard(!!user);
  const { activeRoomId, activeRoomType } = useActiveRoom();
  const relationshipStartDate =
    activeRoomType === 'partner' ? dashboard?.couple?.relationship_start_date ?? null : null;
  const shouldCheck =
    activeRoomType === 'partner' &&
    !!activeRoomId &&
    !!user?.id &&
    !!relationshipStartDate &&
    isMonthsaryDate(relationshipStartDate);

  const { data: monthsaryMessages = [] } = useMonthsaryMessages(activeRoomId, shouldCheck);
  const completeMonthsaryMessage = useCompleteMonthsaryMessage();

  const [activeMessage, setActiveMessage] = useState<MonthsaryMessage | null>(null);
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const todayKey = toLocalDateKey(new Date());
  const dueMessage = useMemo(
    () =>
      shouldCheck
        ? findPendingMonthsaryMessage(monthsaryMessages, user?.id ?? null, todayKey)
        : null,
    [monthsaryMessages, shouldCheck, todayKey, user?.id],
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

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
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

```tsx
// src/components/MonthsaryMessageDialog.tsx
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
          className="max-h-[55vh] overflow-y-auto rounded-lg border border-border/60 bg-muted/30 p-5"
          onScroll={handleScroll}
        >
          <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed">
            {activeMessage.body}
          </p>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>{hasReachedBottom ? 'Reading complete.' : 'Scroll to the bottom to unlock the close button.'}</p>
          <p>{secondsRemaining > 0 ? `${secondsRemaining}s remaining before you can close this message.` : 'Time requirement met.'}</p>
          {errorMessage ? <p className="text-destructive">{errorMessage}</p> : null}
        </div>

        <Button onClick={() => void handleClose()} disabled={!canClose || isCompleting}>
          {isCompleting ? 'Closing...' : 'Close message'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/monthsaryDates.test.ts src/lib/coupleDraft.test.ts src/lib/monthsaryMessageDraft.test.ts src/lib/monthsaryMessageState.test.ts`

Run: `npm run typecheck`

Run: `npm run build`

Expected: all commands exit `0`

- [ ] **Step 5: Commit**

```bash
git add src/components/MonthsaryMessageDialog.tsx src/components/logic/MonthsaryMessageDialog.ts src/lib/monthsaryMessageState.ts src/lib/monthsaryMessageState.test.ts src/App.tsx src/components/AppLayout.tsx src/components/GlobalAppLogic.tsx src/context/ActiveRoomContext.tsx
git commit -m "feat: add global monthsary message popup"
```
