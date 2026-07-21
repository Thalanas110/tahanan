# DASS-21 Mental Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build partner-only DASS-21 monitoring with score-only AES-256-GCM envelope-encrypted persistence, a rolling seven-day limit, and trends.

**Architecture:** Keep answers only in the React form. Calculate the three final scores locally and send only them to a protected Edge Function. The function verifies the caller's partner-couple membership, encrypts a score bundle with a fresh AES-GCM DEK wrapped by a Vault KEK, and writes ciphertext to an RLS-denied table. A second function verifies the same boundary before returning decrypted chart records.

**Tech Stack:** React, TypeScript, Wouter, TanStack Query, Recharts, Supabase Postgres/RLS/Vault, Deno Web Crypto, Node `node:test`.

## Global Constraints

- The exact questions, four choices, subscales, and bands come from `docs/dass-21/DASS-21.md`.
- Show the monitoring-not-diagnosis and consult-a-doctor-if-recurring notice before and during every test and with results.
- Never persist, cache, log, or send answers/question wording outside the mounted form. Send/persist only final `depression`, `anxiety`, and `stress` scores.
- Only the author and the other member of their exact partner couple may access a result. COF is never valid. Enforce this in Edge Functions/database, not in UI alone.
- No key in frontend code, source control, or an application `.env`. Generate the KEK inside Vault and retain a unique 32-byte DEK only in request memory.
- Use AES-256-GCM with distinct 12-byte IVs and AAD values for the score payload and wrapped DEK.
- Allow one entry per user per rolling seven days; the database exclusion constraint is the final race-safe authority.
- Add SQL only as new migration `supabase/migrations/0017_dass_monitoring.sql`.
- Deny direct table access: RLS enabled, no policies, and no `anon`/`authenticated` table privileges.

## File Structure

| File | Purpose |
| --- | --- |
| `src/lib/dass21.ts`, `src/lib/dass21.test.ts` | Questions, scoring, score validation, labels, and tests. |
| `src/types/dassMonitoring.ts` | Chart/result types that contain scores only. |
| `supabase/migrations/0017_dass_monitoring.sql` | Vault key creation, encrypted schema, RLS, limited RPC, seven-day trigger/constraint. |
| `supabase/migrations/dass_monitoring_schema.test.ts` | Static assertions for storage/access SQL. |
| `supabase/functions/_shared/dassEncryption.ts` | Server-only envelope encryption/decryption. |
| `supabase/functions/_shared/dassMonitoring.ts` | Strict body parsing, authorization predicate, cadence calculation. |
| `supabase/functions/_shared/*.test.ts` | Deno crypto, parser, authorization, and cadence tests. |
| `supabase/functions/create-dass-monitoring-entry/index.ts` | Partner-only encrypted writer. |
| `supabase/functions/get-dass-monitoring-history/index.ts` | Partner-only decrypted history reader. |
| `src/hooks/useDassMonitoring.ts` | Edge Function-only TanStack Query data access. |
| `src/pages/logic/mental-monitoring.ts` | Ephemeral answer state and selected-person chart data. |
| `src/pages/mental-monitoring.tsx` | Disclosure, form, results, weekly lock, and chart. |
| `src/App.tsx`, `src/components/Navbar.tsx` | Route and partner-only navigation. |

### Task 1: Implement DASS-21 scoring and score-only types

**Files:** Create `src/lib/dass21.ts`, `src/lib/dass21.test.ts`, and `src/types/dassMonitoring.ts`.

**Produces:** `DassScale`, `DassResponse`, `DassScores`, `DassSeverity`, `DASS_21_QUESTIONS`, `DASS_RESPONSE_OPTIONS`, `calculateDassScores`, `validateDassScores`, and `getDassSeverity`.

- [ ] **Step 1: Write the failing domain tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { DASS_21_QUESTIONS, calculateDassScores, getDassSeverity, validateDassScores } from './dass21.ts';

test('uses the exact seven-question subscales', () => {
  assert.deepEqual(DASS_21_QUESTIONS.filter((q) => q.scale === 'depression').map((q) => q.number), [3, 5, 10, 13, 16, 17, 21]);
  assert.deepEqual(DASS_21_QUESTIONS.filter((q) => q.scale === 'anxiety').map((q) => q.number), [2, 4, 7, 9, 15, 19, 20]);
  assert.deepEqual(DASS_21_QUESTIONS.filter((q) => q.scale === 'stress').map((q) => q.number), [1, 6, 8, 11, 12, 14, 18]);
});

test('doubles each DASS-21 subtotal', () => {
  assert.deepEqual(calculateDassScores(Array(21).fill(1)), { depression: 14, anxiety: 14, stress: 14 });
});

test('rejects incomplete answers and invalid final scores', () => {
  assert.throws(() => calculateDassScores(Array(20).fill(0)), /21 responses/);
  assert.throws(() => calculateDassScores([...Array(20).fill(0), 4]), /0 through 3/);
  assert.throws(() => validateDassScores({ depression: 9, anxiety: 0, stress: 0 }), /even/);
});

test('uses supplied non-diagnostic range labels', () => {
  assert.equal(getDassSeverity('depression', 10), 'Mild');
  assert.equal(getDassSeverity('anxiety', 14), 'Moderate');
  assert.equal(getDassSeverity('stress', 34), 'Extremely Severe');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test src/lib/dass21.test.ts`

Expected: FAIL because `dass21.ts` is absent.

- [ ] **Step 3: Implement the minimal pure domain module**

```ts
export type DassScale = 'depression' | 'anxiety' | 'stress';
export type DassResponse = 0 | 1 | 2 | 3;
export type DassSeverity = 'Normal' | 'Mild' | 'Moderate' | 'Severe' | 'Extremely Severe';
export interface DassScores { depression: number; anxiety: number; stress: number; }
export interface DassQuestion { number: number; scale: DassScale; statement: string; }
```

Populate all 21 `DassQuestion` statements exactly from `docs/dass-21/DASS-21.md`, using the groups asserted above. `calculateDassScores` must require 21 integer answers in `0..3`, sum the appropriate seven answers, and multiply every result by two. `validateDassScores` must require exactly three even integers in `0..42`. Implement the supplied bands: Depression `0-9/10-13/14-20/21-27/28+`; Anxiety `0-7/8-9/10-14/15-19/20+`; Stress `0-14/15-18/19-25/26-33/34+`.

Create score-only chart types:

```ts
export interface DassMonitoringEntry extends DassScores {
  id: string;
  submittedBy: string;
  createdAt: string;
}
export interface DassMonitoringHistory {
  entries: DassMonitoringEntry[];
  nextEligibleAt: string | null;
}
```

- [ ] **Step 4: Verify and commit**

Run: `node --experimental-strip-types --test src/lib/dass21.test.ts`

Expected: PASS with four tests.

Commit only the three Task 1 files with message `feat: add DASS-21 scoring domain`.

### Task 2: Create the encrypted server-only schema

**Files:** Create `supabase/migrations/0017_dass_monitoring.sql` and `supabase/migrations/dass_monitoring_schema.test.ts`.

**Produces:** `dass_monitoring_entries` plus `dass_monitoring_get_kek(text)` executable only by `service_role`.

- [ ] **Step 1: Write the failing migration contract test**

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const sql = readFileSync(new URL('./0017_dass_monitoring.sql', import.meta.url), 'utf8');

test('stores ciphertext only with no COF or plaintext scores', () => {
  assert.match(sql, /create table if not exists public\.dass_monitoring_entries/i);
  assert.match(sql, /ciphertext text not null/i);
  assert.match(sql, /wrapped_data_key text not null/i);
  assert.doesNotMatch(sql, /\b(cof_id|answers|responses|depression\s+int|anxiety\s+int|stress\s+int)\b/i);
});
test('denies Data API table access and KEK RPC access', () => {
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.dass_monitoring_entries from anon, authenticated/i);
  assert.doesNotMatch(sql, /create policy/i);
  assert.match(sql, /grant execute on function public\.dass_monitoring_get_kek\(text\) to service_role/i);
});
test('uses Vault and an exclusion window', () => {
  assert.match(sql, /create extension if not exists supabase_vault/i);
  assert.match(sql, /vault\.create_secret[\s\S]*gen_random_bytes\(32\)/i);
  assert.match(sql, /exclude using gist[\s\S]*submitted_by with =[\s\S]*assessment_window with &&/i);
  assert.match(sql, /interval '7 days'/i);
});
```

- [ ] **Step 2: Run it to verify failure**

Run: `node --experimental-strip-types --test supabase/migrations/dass_monitoring_schema.test.ts`

Expected: FAIL because migration 0017 is absent.

- [ ] **Step 3: Add the single migration**

```sql
create extension if not exists supabase_vault with schema vault;
create extension if not exists btree_gist;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'dass_monitoring_kek_v1') then
    perform vault.create_secret(encode(gen_random_bytes(32), 'base64'), 'dass_monitoring_kek_v1', 'DASS monitoring AES-256-GCM KEK v1');
  end if;
end;
$$;

create table if not exists public.dass_monitoring_entries (
  id uuid primary key,
  couple_id uuid not null references public.couples(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  ciphertext text not null check (length(ciphertext) > 0),
  ciphertext_iv text not null check (length(ciphertext_iv) > 0),
  wrapped_data_key text not null check (length(wrapped_data_key) > 0),
  wrapped_data_key_iv text not null check (length(wrapped_data_key_iv) > 0),
  key_version text not null check (key_version = 'v1'),
  created_at timestamptz not null,
  assessment_window tstzrange not null
);
```

Add a `before insert` trigger that always assigns `new.created_at := clock_timestamp()` and `new.assessment_window := tstzrange(new.created_at, new.created_at + interval '7 days', '[)')`. Add `exclude using gist (submitted_by with =, assessment_window with &&)`. Enable RLS, revoke all table privileges from `anon, authenticated`, and grant only `select, insert` to `service_role`.

Create a `security definer` `public.dass_monitoring_get_kek(p_key_version text)` that accepts only `v1`, selects `decrypted_secret` for `dass_monitoring_kek_v1` from `vault.decrypted_secrets`, and raises `DASS_MONITORING_KEY_UNAVAILABLE` if absent. Revoke all execution from `public, anon, authenticated`; grant execution only to `service_role`.

- [ ] **Step 4: Verify and commit**

Run: `node --experimental-strip-types --test supabase/migrations/dass_monitoring_schema.test.ts`

Expected: PASS with three tests.

Commit only Task 2 files with message `feat: add encrypted DASS monitoring schema`.

### Task 3: Implement testable server-only crypto and access helpers

**Files:** Create `supabase/functions/_shared/dassEncryption.ts`, `dassEncryption.test.ts`, `dassMonitoring.ts`, and `dassMonitoring.test.ts`.

**Produces:** `encryptDassScores`, `decryptDassScores`, `kekFromBase64`, `parseCreateDassBody`, `parseHistoryDassBody`, `getNextEligibleAt`, `canReadDassEntry`.

- [ ] **Step 1: Write failing Deno tests**

```ts
import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1';
import { decryptDassScores, encryptDassScores } from './dassEncryption.ts';
import { canReadDassEntry, getNextEligibleAt, parseCreateDassBody } from './dassMonitoring.ts';

Deno.test('envelope encryption round-trips and binds ciphertext to its couple', async () => {
  const kek = crypto.getRandomValues(new Uint8Array(32));
  const context = { recordId: crypto.randomUUID(), coupleId: 'couple-1', submittedBy: 'author', keyVersion: 'v1' };
  const encrypted = await encryptDassScores({ depression: 12, anxiety: 8, stress: 16 }, kek, context);
  assertEquals(await decryptDassScores(encrypted, kek, context), { depression: 12, anxiety: 8, stress: 16 });
  await assertRejects(() => decryptDassScores(encrypted, kek, { ...context, coupleId: 'cof-1' }));
});

Deno.test('strict create body rejects answer, COF, and sharing fields', () => {
  assertEquals(parseCreateDassBody({ coupleId: 'couple-1', depression: 12, anxiety: 8, stress: 16 }).scores.stress, 16);
  assertThrows(() => parseCreateDassBody({ coupleId: 'couple-1', depression: 0, anxiety: 0, stress: 0, responses: Array(21).fill(0) }));
  assertThrows(() => parseCreateDassBody({ coupleId: 'couple-1', depression: 0, anxiety: 0, stress: 0, cofId: 'cof-1' }));
});

Deno.test('only author or exact partner can read', () => {
  assertEquals(canReadDassEntry({ callerId: 'author', submittedBy: 'author', memberIds: ['author'] }), true);
  assertEquals(canReadDassEntry({ callerId: 'partner', submittedBy: 'author', memberIds: ['author', 'partner'] }), true);
  assertEquals(canReadDassEntry({ callerId: 'cof-user', submittedBy: 'author', memberIds: ['author', 'partner'] }), false);
});

Deno.test('next eligibility is seven rolling days later', () => {
  assertEquals(getNextEligibleAt('2026-07-21T08:00:00.000Z').toISOString(), '2026-07-28T08:00:00.000Z');
});
```

- [ ] **Step 2: Verify test failure**

Run: `deno test supabase/functions/_shared/dassEncryption.test.ts supabase/functions/_shared/dassMonitoring.test.ts`

Expected: FAIL because shared modules are absent.

- [ ] **Step 3: Implement envelope encryption and strict parsing**

Use Web Crypto only. Generate `dek = crypto.getRandomValues(new Uint8Array(32))`, and 12-byte payload/wrapped-DEK IVs. Construct separate AAD values:

```ts
`tahanan:dass-monitoring:v1:payload:${recordId}:${coupleId}:${submittedBy}:${keyVersion}`
`tahanan:dass-monitoring:v1:dek:${recordId}:${coupleId}:${submittedBy}:${keyVersion}`
```

Import 32-byte keys with `crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, usages)`, encrypt JSON scores under the DEK, wrap the DEK under the base64-decoded Vault KEK, and base64 encode ciphertext/IV values. Decryption must authenticate both layers, parse the score bundle, and validate exactly three even `0..42` values. The module must never call `Deno.env`, persist/cache a key, or log inputs.

The strict create parser accepts exactly `{ coupleId, depression, anxiety, stress }`; the history parser accepts exactly `{ coupleId }`. Both reject extra fields. `canReadDassEntry` requires one or two member IDs, never more, and membership for both author and caller. This lets an author read their own result before a second partner joins while denying all non-members. `getNextEligibleAt` adds `7 * 24 * 60 * 60 * 1000` milliseconds.

- [ ] **Step 4: Verify and commit**

Run: `deno test supabase/functions/_shared/dassEncryption.test.ts supabase/functions/_shared/dassMonitoring.test.ts`

Expected: PASS with four tests.

Run: `deno check supabase/functions/_shared/dassEncryption.ts supabase/functions/_shared/dassMonitoring.ts`

Expected: PASS.

Commit only Task 3 files with message `feat: add DASS encryption primitives`.

### Task 4: Implement protected DASS Edge Functions

**Files:** Create `supabase/functions/create-dass-monitoring-entry/index.ts` and `supabase/functions/get-dass-monitoring-history/index.ts`.

**Consumes:** Task 2 schema/RPC, Task 3 helpers, and existing `userClient`, `adminClient`, `errorResponse`, `jsonResponse`, and CORS helpers.

- [ ] **Step 1: Implement the writer**

Authenticate with `userClient(req).auth.getUser()`, parse only the Task 3 create body, then prove membership server-side:

```ts
const { data: membership } = await admin
  .from('couple_members')
  .select('user_id')
  .eq('couple_id', coupleId)
  .eq('user_id', user.id)
  .maybeSingle();
if (!membership) return errorResponse('Mental Monitoring is available only in your partner space', 403);
```

Read the caller's most recent encrypted-entry `created_at` and reject a future `getNextEligibleAt` with `409`. Invoke restricted `dass_monitoring_get_kek('v1')`, generate `crypto.randomUUID()`, encrypt scores, and insert only `id`, `couple_id`, `submitted_by`, `ciphertext`, `ciphertext_iv`, `wrapped_data_key`, `wrapped_data_key_iv`, and `key_version`. The DB trigger owns timestamps. Map database error code `23P01` to a `409` seven-day response. Return only camelCase entry scores and `nextEligibleAt`; never ciphertext/key information or logs.

- [ ] **Step 2: Implement the reader**

Authenticate, parse only `{ coupleId }`, and query `couple_members`. Require one or two members and require the caller ID. Query encrypted entries for the couple only. Before every decrypt call:

```ts
if (!canReadDassEntry({ callerId: user.id, submittedBy: row.submitted_by, memberIds })) {
  return errorResponse('Not authorized', 403);
}
```

Fetch the row's versioned KEK, decrypt with record/couple/author/version AAD, and map to `{ id, submittedBy, createdAt, depression, anxiety, stress }`. Compute `nextEligibleAt` only from the caller's last entry. Do not accept `cofId`, room type, recipient, sharing, timestamps, or answers. Return generic failures without crypto/database logging.

- [ ] **Step 3: Verify and commit**

Run: `deno check supabase/functions/create-dass-monitoring-entry/index.ts supabase/functions/get-dass-monitoring-history/index.ts`

Expected: PASS.

Commit only the two endpoints with message `feat: add partner-only DASS monitoring APIs`.

### Task 5: Build score-only client access and Mental Monitoring UI

**Files:** Create `src/hooks/useDassMonitoring.ts`, `src/hooks/useDassMonitoring.test.ts`, `src/pages/logic/mental-monitoring.ts`, `src/pages/logic/mental-monitoring.test.ts`, and `src/pages/mental-monitoring.tsx`.

**Produces:** an ephemeral questionnaire, results, and per-person score trend charts.

- [ ] **Step 1: Write failing pure state and request-shape tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { canStartDassAssessment, selectEntriesForPerson } from './mental-monitoring.ts';

test('assessment is unavailable in COF and before server eligibility', () => {
  assert.equal(canStartDassAssessment({ activeRoomType: 'cof', nextEligibleAt: null, now: new Date() }), false);
  assert.equal(canStartDassAssessment({ activeRoomType: 'partner', nextEligibleAt: '2026-07-28T00:00:00Z', now: new Date('2026-07-27T23:59:59Z') }), false);
});

test('chart data is isolated to its selected person', () => {
  const entries = [
    { id: 'mine', submittedBy: 'me', createdAt: '2026-07-01T00:00:00Z', depression: 2, anxiety: 4, stress: 6 },
    { id: 'partner', submittedBy: 'them', createdAt: '2026-07-02T00:00:00Z', depression: 8, anxiety: 10, stress: 12 },
  ];
  assert.deepEqual(selectEntriesForPerson(entries, 'me'), [entries[0]]);
});
```

Add a source-contract hook test that requires only these function bodies and rejects `answers`, `responses`, `cofId`, and `roomType`:

```ts
invokeEdgeFunction('create-dass-monitoring-entry', { coupleId, ...scores })
invokeEdgeFunction('get-dass-monitoring-history', { coupleId })
```

- [ ] **Step 2: Verify test failure**

Run: `node --experimental-strip-types --test src/pages/logic/mental-monitoring.test.ts src/hooks/useDassMonitoring.test.ts`

Expected: FAIL because logic and hook are absent.

- [ ] **Step 3: Implement hook and ephemeral logic**

Use `dassMonitoringQueryKey = (coupleId) => ['dass-monitoring', coupleId] as const`; never call `.from('dass_monitoring_entries')`. Only enable history when `activeRoomType === 'partner' && !!coupleId`. The mutation accepts `DassScores`, sends only its three values plus `coupleId`, and invalidates that exact couple key.

Keep `Record<number, DassResponse | undefined>` only in React state. On submit require all 21 values, calculate scores, call the score-only mutation, then clear the response object. Retain it only during a failed in-memory retry; clear on cancel. Never pass it to a cache, storage API, chart, toast, or request.

- [ ] **Step 4: Implement page content and chart**

Render the following alert before Start, above answers, and in results:

```tsx
<Alert className="border-amber-500/30 bg-amber-50 text-amber-950">
  <HeartPulse className="h-4 w-4" />
  <AlertTitle>DASS-21 is for monitoring, not diagnosis.</AlertTitle>
  <AlertDescription>
    It reflects the past week. If signs of emotional difficulty keep appearing, consult a doctor or qualified mental-health professional. If you may harm yourself or someone else, contact local emergency services now.
  </AlertDescription>
</Alert>
```

Render every supplied question and all four response options. Disable submit until all are answered. Show the future server `nextEligibleAt` instead of Start. On COF direct URLs, render only `Mental Monitoring is available in your partner space.` and never enable history.

Use tabs for the authenticated user and `getPartnerMember(roomMembers, user.id)`. Render three responsive score lines with `YAxis domain={[0, 42]}`. Show `getDassSeverity` only for the just-submitted result, prefaced by `These ranges are not a diagnosis.` Do not show answer history, delete/edit controls, a visibility switch, recipient selection, or a COF selector.

- [ ] **Step 5: Verify and commit**

Run: `node --experimental-strip-types --test src/lib/dass21.test.ts src/hooks/useDassMonitoring.test.ts src/pages/logic/mental-monitoring.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

Commit only Task 5 files with message `feat: add DASS mental monitoring page`.

### Task 6: Route, navigation, and full verification

**Files:** Modify `src/App.tsx` and `src/components/Navbar.tsx`.

- [ ] **Step 1: Add protected route and partner-only navigation**

Add `/mental-monitoring` with the same `ProtectedRoute` and `AppLayout` nesting as `/health`:

```tsx
<Route path="/mental-monitoring">
  <ProtectedRoute><AppLayout><MentalMonitoring /></AppLayout></ProtectedRoute>
</Route>
```

Add `{ href: '/mental-monitoring', label: 'Mental Monitoring', icon: Brain, partnerOnly: true }` to `MORE_NAV`. Make the shared desktop/mobile nav filter require `activeRoomType === 'partner'` for `partnerOnly`, preserving the existing `cofOnly` rule. This is navigation convenience only.

- [ ] **Step 2: Run all feature verification**

Run: `node --experimental-strip-types --test src/lib/dass21.test.ts src/hooks/useDassMonitoring.test.ts src/pages/logic/mental-monitoring.test.ts supabase/migrations/dass_monitoring_schema.test.ts`

Expected: PASS.

Run: `deno test supabase/functions/_shared/dassEncryption.test.ts supabase/functions/_shared/dassMonitoring.test.ts`

Expected: PASS.

Run: `deno check supabase/functions/create-dass-monitoring-entry/index.ts supabase/functions/get-dass-monitoring-history/index.ts`

Expected: PASS.

Run: `npm run typecheck` and then `npm run build`

Expected: both PASS.

- [ ] **Step 3: Perform final server-boundary inspection and commit**

Confirm: no plaintext/answer/COF columns; no source/.env KEK; Vault RPC only for service role; table RLS with no policies; server membership checks before all encryption/decryption; `23P01` handled; no direct frontend table query. Commit route/navigation-only changes with message `feat: add mental monitoring navigation`.

## Plan Self-Review

- **Spec coverage:** Tasks 1 and 5 implement the supplied assessment, disclosures, no-answer persistence, scores, weekly UI, results, and charts. Tasks 2 through 4 implement Vault envelope encryption, no frontend/.env keys, partner-only server enforcement, COF denial, RLS, and the race-safe seven-day limit. Task 6 proves the integrated result.
- **Placeholder scan:** All changed files, security rules, input shapes, migration mechanism, tests, commands, expected results, and commit scopes are defined.
- **Type consistency:** Scores are always `depression`, `anxiety`, and `stress`; storage uses ciphertext-only snake_case columns; returned chart entries use camelCase metadata plus final scores.
