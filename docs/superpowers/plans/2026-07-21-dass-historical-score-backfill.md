# DASS-21 Historical Score Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Temporarily allow a person to add their own historical final DASS-21 scores while preserving encrypted score storage, partner-only visibility, and a server-enforced seven-day gap.

**Architecture:** A new immutable migration makes `taken_at` the authoritative assessment timestamp while retaining server-controlled `created_at` for auditing. A dedicated temporary Edge Function accepts a strict date-and-final-scores payload, converts the date to Asia/Manila midnight, encrypts scores with the existing envelope flow, and relies on the database exclusion constraint for the concurrency-safe weekly limit. The client exposes a removable partner-space-only form and displays histories, charts, and exports from `takenAt`.

**Tech Stack:** React/TypeScript, TanStack Query, date-fns, Supabase Edge Functions (Deno), PostgreSQL/Supabase Vault, AES-256-GCM, Node test runner, Deno tests, jsPDF.

## Global Constraints

- Do not modify any existing SQL migration; add `supabase/migrations/0018_dass_monitoring_taken_at.sql` as the only schema change.
- Do not commit, push, deploy, or add any cryptographic key to the frontend or an environment file.
- Store only encrypted final Depression, Anxiety, and Stress scores; never store or transmit DASS answers, an overall status, a diagnosis, or a Circle of Friends identifier.
- Enforce authorization, date validity, and the seven-day interval on the server; client validation is only a usability aid.
- Permit only the authenticated person's own historical records, visible only to that person and their partner; never expose the feature in a Circle of Friends room.
- Accept date-only backfills through the current Asia/Manila date and canonicalize each to `00:00:00+08:00` server-side.
- Keep the backfill UI and `backfill-dass-monitoring-entry` function isolated so they can be removed after data entry without removing historical records or `taken_at`.

## File Structure

| Path | Responsibility |
| --- | --- |
| `supabase/migrations/0018_dass_monitoring_taken_at.sql` | Adds `taken_at`, derives the protected seven-day window from it, and preserves `created_at` as audit time. |
| `supabase/migrations/dass_monitoring_schema.test.ts` | Static contract tests for both immutable DASS migrations. |
| `supabase/functions/_shared/dassMonitoring.ts` | Strict backfill payload parser and Asia/Manila date conversion alongside existing shared DASS rules. |
| `supabase/functions/_shared/dassMonitoring.test.ts` | Deno tests for the strict backfill parser and server date rules. |
| `supabase/functions/backfill-dass-monitoring-entry/index.ts` | Temporary authenticated, member-authorized encrypted backfill writer. |
| `supabase/functions/create-dass-monitoring-entry/index.ts` | Maps normal-write results and eligibility to `taken_at`. |
| `supabase/functions/get-dass-monitoring-history/index.ts` | Orders and returns authorized history by `taken_at`. |
| `supabase/functions/dassMonitoringEndpoints.test.ts` | Source contracts for the three DASS Edge Function handlers. |
| `src/types/dassMonitoring.ts` | Client API type with `takenAt` rather than audit `createdAt`. |
| `src/hooks/useDassMonitoring.ts` | Server-only mutation for the temporary backfill writer. |
| `src/hooks/useDassMonitoring.test.ts` | Source contract that the hook invokes only the approved DASS Edge Functions. |
| `src/lib/dassReports.ts` and `src/lib/dassReports.test.ts` | Builds export rows from `takenAt`. |
| `src/pages/mental-monitoring.tsx` | Removable historical-score card and all assessment-date display changes. |
| `src/pages/mental-monitoring.test.ts` | Page source contract for partner-only, sensitive temporary entry UX. |

---

### Task 1: Make `taken_at` the immutable schema's assessment timestamp

**Files:**
- Create: `supabase/migrations/0018_dass_monitoring_taken_at.sql`
- Modify: `supabase/migrations/dass_monitoring_schema.test.ts`

**Interfaces:**
- Consumes: `public.dass_monitoring_entries.created_at` and its existing `assessment_window` exclusion constraint from migration `0017`.
- Produces: `dass_monitoring_entries.taken_at timestamptz not null`, a `taken_at <= created_at` invariant, and a trigger that derives `assessment_window` from `taken_at`.

- [ ] **Step 1: Write failing migration-contract tests**

  Extend the test to load both migration files and assert the new migration leaves `0017` unchanged while it introduces the assessment timestamp and a trigger based on it:

  ```ts
  const takenAtSql = readFileSync(
    new URL('./0018_dass_monitoring_taken_at.sql', import.meta.url),
    'utf8',
  );

  test('DASS assessment time is immutable metadata and drives the weekly window', () => {
    assert.match(takenAtSql, /add column taken_at timestamptz/i);
    assert.match(takenAtSql, /update public\.dass_monitoring_entries\s+set taken_at = created_at/i);
    assert.match(takenAtSql, /alter column taken_at set not null/i);
    assert.match(takenAtSql, /check \(taken_at <= created_at\)/i);
    assert.match(takenAtSql, /new\.taken_at := coalesce\(new\.taken_at, new\.created_at\)/i);
    assert.match(takenAtSql, /tstzrange\(\s*new\.taken_at,\s*new\.taken_at \+ interval '7 days'/i);
    assert.doesNotMatch(takenAtSql, /\b(answers|responses|depression\s+int|anxiety\s+int|stress\s+int)\b/i);
  });
  ```

- [ ] **Step 2: Run the migration-contract test and verify failure**

  Run: `node --experimental-strip-types --test supabase/migrations/dass_monitoring_schema.test.ts`

  Expected: FAIL because `0018_dass_monitoring_taken_at.sql` does not yet exist.

- [ ] **Step 3: Add the new migration without altering `0017`**

  Create exactly one new migration with this SQL. It preserves all prior encrypted-score and RLS protections, copies existing audit times to the new assessment field, and replaces only the trigger definition that migration `0017` intentionally named for replacement:

  ```sql
  -- DASS-21 historical assessment timestamps.
  -- Existing migrations are immutable; this migration only extends 0017.

  alter table public.dass_monitoring_entries
    add column taken_at timestamptz;

  update public.dass_monitoring_entries
  set taken_at = created_at
  where taken_at is null;

  alter table public.dass_monitoring_entries
    alter column taken_at set not null;

  alter table public.dass_monitoring_entries
    add constraint dass_monitoring_entries_taken_at_not_after_created_at
    check (taken_at <= created_at);

  create or replace function public.set_dass_monitoring_window()
  returns trigger
  language plpgsql
  set search_path = public
  as $$
  begin
    new.created_at := clock_timestamp();
    new.taken_at := coalesce(new.taken_at, new.created_at);
    new.assessment_window := tstzrange(
      new.taken_at,
      new.taken_at + interval '7 days',
      '[)'
    );
    return new;
  end;
  $$;

  update public.dass_monitoring_entries
  set assessment_window = tstzrange(
    taken_at,
    taken_at + interval '7 days',
    '[)'
  );
  ```

  The existing `submitted_by` + `assessment_window` GiST exclusion constraint is intentionally reused: it prohibits another historical or current entry less than seven days before or after a record, including concurrent inserts.

- [ ] **Step 4: Run the migration-contract test and verify success**

  Run: `node --experimental-strip-types --test supabase/migrations/dass_monitoring_schema.test.ts`

  Expected: PASS for every existing encryption/RLS contract plus the new assessment-time contract.

- [ ] **Step 5: Check the migration is additive and uncommitted**

  Run: `git diff --check; git status --short`

  Expected: no whitespace errors; `0018_dass_monitoring_taken_at.sql` and local planning/spec files may be untracked or modified; no commit is created.

### Task 2: Add strict server-side historical-input parsing and the temporary writer

**Files:**
- Modify: `supabase/functions/_shared/dassMonitoring.ts`
- Modify: `supabase/functions/_shared/dassMonitoring.test.ts`
- Create: `supabase/functions/backfill-dass-monitoring-entry/index.ts`
- Modify: `supabase/functions/create-dass-monitoring-entry/index.ts`
- Modify: `supabase/functions/get-dass-monitoring-history/index.ts`
- Modify: `supabase/functions/dassMonitoringEndpoints.test.ts`

**Interfaces:**
- Consumes: `encryptDassScores`, `kekFromBase64`, `adminClient`, and `userClient` from the existing DASS implementation.
- Produces: `parseBackfillDassBody(value, now?)`, which returns `{ coupleId, scores, takenAt }`; `backfill-dass-monitoring-entry`; and history/create responses whose `entry` property uses `takenAt`.

- [ ] **Step 1: Write failing shared-rule and handler-contract tests**

  Add Deno tests which prove the backfill request accepts only the five allowed fields, canonicalizes a Philippines date, rejects impossible/future dates and injected answers, and still applies the existing final-score rules:

  ```ts
  Deno.test('backfill parser accepts only a date and final scores', () => {
    const result = parseBackfillDassBody(
      { coupleId: 'couple-1', takenOn: '2026-01-05', depression: 12, anxiety: 8, stress: 16 },
      new Date('2026-07-21T08:00:00.000Z'),
    );
    assertEquals(result.coupleId, 'couple-1');
    assertEquals(result.scores, { depression: 12, anxiety: 8, stress: 16 });
    assertEquals(result.takenAt.toISOString(), '2026-01-04T16:00:00.000Z');
  });

  Deno.test('backfill parser rejects future, impossible, and expanded requests', () => {
    const now = new Date('2026-07-21T08:00:00.000Z');
    assertThrows(() => parseBackfillDassBody(
      { coupleId: 'couple-1', takenOn: '2026-07-22', depression: 0, anxiety: 0, stress: 0 }, now,
    ));
    assertThrows(() => parseBackfillDassBody(
      { coupleId: 'couple-1', takenOn: '2026-02-30', depression: 0, anxiety: 0, stress: 0 }, now,
    ));
    assertThrows(() => parseBackfillDassBody(
      { coupleId: 'couple-1', takenOn: '2026-01-05', depression: 0, anxiety: 0, stress: 0, responses: [] }, now,
    ));
  });
  ```

  Extend the Node source contract to load `backfill-dass-monitoring-entry/index.ts` and assert it uses `userClient(req)`, `parseBackfillDassBody`, couple-membership checks, Vault KEK RPC, `encryptDassScores(scores, ...)`, `taken_at: takenAt.toISOString()`, and `23P01` handling. Assert it contains no `cofId`, `roomType`, `responses`, `answers`, `userId`, or encryption-key literal.

- [ ] **Step 2: Run focused tests and verify failure**

  Run:

  ```powershell
  & 'C:\Users\Adriaan M. Dimate\.deno\bin\deno.exe' test supabase/functions/_shared/dassMonitoring.test.ts
  node --experimental-strip-types --test supabase/functions/dassMonitoringEndpoints.test.ts
  ```

  Expected: FAIL because the parser and temporary handler do not exist.

- [ ] **Step 3: Implement the date-only parser and its server time conversion**

  In `dassMonitoring.ts`, add the strict key list and parser. Preserve `requireExactObject` and `requireFinalScore`; reuse them rather than accepting a looser object. The implementation must validate day-of-month before creating the `Date`, compare only zero-padded date strings, and construct the timestamp in the server, never from a browser-provided time:

  ```ts
  const BACKFILL_KEYS = ['coupleId', 'takenOn', 'depression', 'anxiety', 'stress'] as const;

  function manilaDate(now: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const value = (type: 'year' | 'month' | 'day') =>
      parts.find((part) => part.type === type)?.value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  }

  function requireTakenOn(value: unknown, now: Date): Date {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error('takenOn must be a calendar date');
    }
    const [year, month, day] = value.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth || value > manilaDate(now)) {
      throw new Error('takenOn must be a past or current Philippines date');
    }
    return new Date(`${value}T00:00:00.000+08:00`);
  }

  export function parseBackfillDassBody(value: unknown, now = new Date()) {
    const object = requireExactObject(value, BACKFILL_KEYS);
    if (typeof object.coupleId !== 'string' || object.coupleId.length === 0) {
      throw new Error('coupleId is required');
    }
    return {
      coupleId: object.coupleId,
      takenAt: requireTakenOn(object.takenOn, now),
      scores: {
        depression: requireFinalScore(object.depression),
        anxiety: requireFinalScore(object.anxiety),
        stress: requireFinalScore(object.stress),
      },
    };
  }
  ```

- [ ] **Step 4: Implement the dedicated temporary Edge Function**

  Create `backfill-dass-monitoring-entry/index.ts` by following the existing normal-writer structure exactly: answer CORS `OPTIONS`, permit only `POST`, authenticate first, parse the strict body, prove membership with `couple_members`, fetch the managed Vault KEK, encrypt only the scores, and insert as the authenticated author. Its core insert and conflict branch must be:

  ```ts
  const { data: row, error: insertError } = await admin
    .from('dass_monitoring_entries')
    .insert({
      id: recordId,
      couple_id: coupleId,
      submitted_by: user.id,
      ciphertext: encrypted.ciphertext,
      ciphertext_iv: encrypted.ciphertextIv,
      wrapped_data_key: encrypted.wrappedDataKey,
      wrapped_data_key_iv: encrypted.wrappedDataKeyIv,
      key_version: KEY_VERSION,
      taken_at: takenAt.toISOString(),
    })
    .select('id, submitted_by, taken_at')
    .single();

  if (insertError?.code === '23P01') {
    return errorResponse('DASS-21 scores must be at least seven days apart', 409);
  }
  if (insertError || !row) {
    return errorResponse('Could not save historical DASS-21 monitoring scores', 500);
  }
  return jsonResponse({
    entry: { id: row.id, submittedBy: row.submitted_by, takenAt: row.taken_at, ...scores },
  });
  ```

  Do not precompute a client-trusted eligibility value. The Edge Function parser plus the migration's exclusion constraint are the authoritative validation path, and the constraint closes insertion races.

- [ ] **Step 5: Move normal writes and reads to `taken_at`**

  In `create-dass-monitoring-entry/index.ts`, make `nextEligibleAtForUser` select/order `taken_at`; select `id, submitted_by, taken_at` after insertion; return `takenAt: row.taken_at`; and calculate eligibility from `row.taken_at`.

  In `get-dass-monitoring-history/index.ts`, select and order by `taken_at`, map rows to `takenAt: row.taken_at`, and calculate `nextEligibleAt` from `latestMine.takenAt`. Keep all membership checks, `canReadDassEntry` checks, decryption, and response error behavior unchanged.

- [ ] **Step 6: Run the focused server tests and static check**

  Run:

  ```powershell
  & 'C:\Users\Adriaan M. Dimate\.deno\bin\deno.exe' test supabase/functions/_shared/dassMonitoring.test.ts supabase/functions/_shared/dassEncryption.test.ts
  & 'C:\Users\Adriaan M. Dimate\.deno\bin\deno.exe' check supabase/functions/_shared/dassMonitoring.ts supabase/functions/backfill-dass-monitoring-entry/index.ts supabase/functions/create-dass-monitoring-entry/index.ts supabase/functions/get-dass-monitoring-history/index.ts
  node --experimental-strip-types --test supabase/functions/dassMonitoringEndpoints.test.ts
  ```

  Expected: PASS. The Deno check must report no type errors and the source contracts must still prove server-only encryption and partner membership authorization.

### Task 3: Update the typed client contract and retain server-only persistence

**Files:**
- Modify: `src/types/dassMonitoring.ts`
- Modify: `src/hooks/useDassMonitoring.ts`
- Modify: `src/hooks/useDassMonitoring.test.ts`

**Interfaces:**
- Consumes: history and writer Edge Function JSON where each entry has `id`, `submittedBy`, `takenAt`, and three final scores.
- Produces: `DassMonitoringEntry.takenAt` and `backfillEntry.mutateAsync({ takenOn, depression, anxiety, stress })` for the page.

- [ ] **Step 1: Write a failing hook source contract**

  Extend the existing test so it requires the temporary Edge Function name and rejects direct database or crypto access:

  ```ts
  assert.match(source, /backfill-dass-monitoring-entry/);
  assert.match(source, /backfillEntry/);
  assert.doesNotMatch(
    source,
    /from\('dass_monitoring_entries'\)|AES|kek|encryptionKey|responses|answers/,
  );
  ```

- [ ] **Step 2: Run the hook test and verify failure**

  Run: `node --experimental-strip-types --test src/hooks/useDassMonitoring.test.ts`

  Expected: FAIL because no historical-backfill mutation exists.

- [ ] **Step 3: Change the entry type and add the mutation**

  Replace the client-facing audit field and add a dedicated input/result type in `useDassMonitoring.ts`:

  ```ts
  export interface DassMonitoringEntry extends DassScores {
    id: string;
    submittedBy: string;
    takenAt: string;
  }

  interface BackfillDassMonitoringInput extends DassScores {
    takenOn: string;
  }

  const backfillEntry = useMutation({
    mutationFn: (input: BackfillDassMonitoringInput) => {
      if (!coupleId) throw new Error('A partner space is required');
      return invokeEdgeFunction<{ entry: DassMonitoringEntry }>(
        'backfill-dass-monitoring-entry',
        { coupleId, ...input },
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: dassMonitoringQueryKey(coupleId) }),
  });
  ```

  Return `backfillEntry` beside `historyQuery` and `createEntry`. Do not add a raw-table query, local persistence, a key, a user ID, or an encryption parameter.

- [ ] **Step 4: Run the hook contract and TypeScript check**

  Run:

  ```powershell
  node --experimental-strip-types --test src/hooks/useDassMonitoring.test.ts
  npm.cmd run typecheck
  ```

  Expected: the hook contract passes; TypeScript may still fail in report/page consumers that reference `createdAt`, which Task 4 corrects.

### Task 4: Add the removable partner-space backfill card and use assessment dates everywhere

**Files:**
- Modify: `src/lib/dassReports.ts`
- Modify: `src/lib/dassReports.test.ts`
- Modify: `src/pages/mental-monitoring.tsx`
- Modify: `src/pages/mental-monitoring.test.ts`

**Interfaces:**
- Consumes: `DassMonitoringEntry.takenAt`, `backfillEntry.mutateAsync`, existing `getDassSeverity`, report helpers, and partner-room gating.
- Produces: a temporary form that sends `{ takenOn, depression, anxiety, stress }`, charts/reports ordered by `takenAt`, and privacy/monitoring copy in the user interface.

- [ ] **Step 1: Write failing report and page contracts**

  Update report fixtures to use `takenAt` and assert `buildDassReportRows` emits that exact timestamp as `dateTaken`. Extend the page source contract with these requirements:

  ```ts
  assert.match(source, /Backfill historical scores/);
  assert.match(source, /Visible only to you and your partner[\s\S]*Circle of Friends/i);
  assert.match(source, /type="date"/);
  assert.match(source, /backfillEntry\.mutateAsync/);
  assert.match(source, /entry\.takenAt/);
  assert.doesNotMatch(source, /from\('dass_monitoring_entries'\)|VITE_.*(?:KEY|SECRET)/);
  ```

  Preserve the existing assertions for the monitoring-not-diagnosis disclosure, doctor consultation, CSV/PDF export helpers, and no direct export endpoint.

- [ ] **Step 2: Run focused client tests and verify failure**

  Run:

  ```powershell
  node --experimental-strip-types --test src/lib/dassReports.test.ts src/lib/dassPdfReport.test.ts src/pages/mental-monitoring.test.ts
  ```

  Expected: FAIL because report fixtures and the page still use `createdAt`, and the temporary card does not exist.

- [ ] **Step 3: Make reports and chart dates use `takenAt`**

  Change the report mapper to retain the logical assessment time:

  ```ts
  export function buildDassReportRows(entries: readonly DassMonitoringEntry[]): DassReportRow[] {
    return entries.map(({ takenAt, depression, anxiety, stress }) => ({
      dateTaken: takenAt,
      depression,
      anxiety,
      stress,
      overallStatus: getOverallDassStatus({ depression, anxiety, stress }),
    }));
  }
  ```

  In `mental-monitoring.tsx`, change the chart label from `entry.createdAt` to `entry.takenAt`. The existing history endpoint sorts by the same field, so `latestEntry`, CSV, PDF, and the trend chart will agree on the latest assessment.

- [ ] **Step 4: Implement the temporary direct-score card**

  Import the existing `Input` component and `DassScores` type. Add local state for one date and the three score fields; these values live only in React state until the server mutation succeeds:

  ```ts
  const [backfillTakenOn, setBackfillTakenOn] = useState('');
  const [backfillScores, setBackfillScores] = useState<Partial<DassScores>>({});
  const isBackfillComplete =
    /^\d{4}-\d{2}-\d{2}$/.test(backfillTakenOn) &&
    (['depression', 'anxiety', 'stress'] as const).every((scale) => {
      const score = backfillScores[scale];
      return Number.isInteger(score) && score! >= 0 && score! <= 42 && score! % 2 === 0;
    });

  const submitBackfill = async () => {
    if (!isBackfillComplete) return;
    try {
      await backfillEntry.mutateAsync({
        takenOn: backfillTakenOn,
        depression: backfillScores.depression!,
        anxiety: backfillScores.anxiety!,
        stress: backfillScores.stress!,
      });
      setBackfillTakenOn('');
      setBackfillScores({});
      toast.success('Historical DASS-21 monitoring scores have been saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save historical DASS-21 monitoring scores.');
    }
  };
  ```

  Render this card only inside the existing successful partner-space branch, below the normal weekly card. Use a `type="date"` input with `max={format(new Date(), 'yyyy-MM-dd')}` as a convenience guard, and render three `type="number" min="0" max="42" step="2"` inputs. The card must include this exact privacy intent in visible copy: **"Visible only to you and your partner. It is never shared with a Circle of Friends room."** It must also say that the user is entering final scores only, that DASS-21 is monitoring rather than diagnosis, and that the server checks the date and seven-day gap. Keep the persistent top-level doctor-consultation notice unchanged.

- [ ] **Step 5: Run focused client tests and full type check**

  Run:

  ```powershell
  node --experimental-strip-types --test src/lib/dassReports.test.ts src/lib/dassPdfReport.test.ts src/hooks/useDassMonitoring.test.ts src/pages/logic/mentalMonitoring.test.ts src/pages/mental-monitoring.test.ts
  npm.cmd run typecheck
  ```

  Expected: PASS. The client must compile without any remaining `createdAt` reference in DASS entry consumers.

### Task 5: Verify the complete local change and document removal readiness

**Files:**
- Verify only: all files changed by Tasks 1-4.

**Interfaces:**
- Consumes: complete schema, Edge Function, client type, report, and UI changes.
- Produces: evidence that the temporary feature is safe to use locally and can later be removed by deleting a single UI path and Edge Function while retaining data.

- [ ] **Step 1: Search for stale timestamps and unsafe data paths**

  Run:

  ```powershell
  rg -n "createdAt|created_at" src supabase/functions | rg "dass|Dass|DASS"
  rg -n "responses|answers|cofId|roomType|encryptionKey|VITE_.*(?:KEY|SECRET)" src/hooks/useDassMonitoring.ts supabase/functions/backfill-dass-monitoring-entry/index.ts
  ```

  Expected: DASS client consumers use `takenAt`; remaining server `created_at` references are only the migration's audit invariant. The new endpoint has no answers, COF identifiers, frontend secrets, or raw key material; its Vault KEK operation remains server-only.

- [ ] **Step 2: Run all focused test suites**

  Run:

  ```powershell
  node --experimental-strip-types --test src/lib/dass21.test.ts src/lib/dassReports.test.ts src/lib/dassPdfReport.test.ts supabase/migrations/dass_monitoring_schema.test.ts supabase/functions/dassMonitoringEndpoints.test.ts src/App.dassRoute.test.ts src/components/logic/navbarVisibility.test.ts src/hooks/useDassMonitoring.test.ts src/pages/logic/mentalMonitoring.test.ts src/pages/mental-monitoring.test.ts
  & 'C:\Users\Adriaan M. Dimate\.deno\bin\deno.exe' test supabase/functions/_shared/dassEncryption.test.ts supabase/functions/_shared/dassMonitoring.test.ts
  & 'C:\Users\Adriaan M. Dimate\.deno\bin\deno.exe' check supabase/functions/_shared/dassEncryption.ts supabase/functions/_shared/dassMonitoring.ts supabase/functions/backfill-dass-monitoring-entry/index.ts supabase/functions/create-dass-monitoring-entry/index.ts supabase/functions/get-dass-monitoring-history/index.ts
  npm.cmd run typecheck
  npm.cmd run build
  ```

  Expected: every test passes, both Deno checks report no type errors, type checking passes, and Vite produces a production build. Treat a failure as a debugging task before claiming completion.

- [ ] **Step 3: Inspect a historical export**

  Use a representative entry whose `takenAt` is `2026-01-05T00:00:00+08:00` and create a PDF with `getDassPdfBlob` or `createDassPdfReport`. Render its first page and inspect it: the chart, table, and CSV/PDF date must show January 5 rather than the insertion date; no text may clip or overlap.

- [ ] **Step 4: Confirm the planned removal boundary without removing it**

  Run: `git status --short`

  Expected: all work remains local and uncommitted. Record that completion of backfill will remove only `supabase/functions/backfill-dass-monitoring-entry/`, the `backfillEntry` mutation, the historical-score card and its tests, then delete the deployed Edge Function with explicit user approval. Keep migration `0018` and every historical row.
