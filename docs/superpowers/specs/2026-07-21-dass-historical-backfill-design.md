# DASS-21 Historical Score Backfill Design

## Purpose

Temporarily let a person add their own historical DASS-21 final scores so that the Mental Monitoring trend can include past assessments. The feature is for monitoring, not diagnosis. It continues to avoid storing questionnaire answers and must preserve the existing privacy, encryption, and weekly-frequency guarantees.

## Scope

- Add a temporary **Backfill historical scores** card in Mental Monitoring, only when the current room is the user's partner space. It remains unavailable in Circle of Friends rooms.
- Let the signed-in user select any past calendar date through the current date in Asia/Manila and enter the three already-computed DASS scores: Depression, Anxiety, and Stress.
- Accept only the same valid final-score values used by the normal assessment flow: whole, even numbers from 0 through 42. The UI may show the conventional monitoring bands, but it sends and stores only the three final scores.
- Treat each selected calendar date as 00:00 Asia/Manila. This fixed, server-applied date-level convention avoids browser-timezone differences, permits the current Philippines date even before the user's usual Monday afternoon, and lets the database enforce seven-day gaps consistently.
- Allow a record only when its logical assessment time is at least seven days from every existing record for that person, whether the other record is historical or newly taken. Past dates, dates after the Philippines current calendar date, invalid scores, and conflicting dates are rejected server-side.
- Keep the temporary UI and Edge Function separate from the normal DASS assessment endpoint. Once backfill is complete, removal consists of removing that card and its client hook and deleting the dedicated Edge Function. Historical data and the permanent assessment-time schema remain intact.

## Data and Security

Add a new immutable PostgreSQL migration; do not alter `0017_dass_monitoring.sql`. The migration adds a required `taken_at` timestamp to `public.dass_monitoring_entries`, initializes existing rows from `created_at`, and revises the insert trigger so that:

- Normal assessment inserts have `taken_at` set to server time.
- The temporary backfill endpoint may provide an already-validated historical `taken_at` value.
- `created_at` remains a server-controlled audit timestamp.
- `assessment_window` is derived from `taken_at` as `[taken_at, taken_at + 7 days)`, so the existing exclusion constraint blocks all overlapping seven-day intervals.
- A database check rejects `taken_at` values after `created_at`.

The existing envelope-encryption scheme remains unchanged. The three scores are encrypted with AES-256-GCM before persistence, the data-encryption key is wrapped by the managed Supabase Vault key-encryption key, and no cryptographic key is sent to the browser or added to an environment file. Neither the new table field nor the temporary endpoint stores individual questionnaire responses, severity labels, or an overall diagnosis. `taken_at`, author, couple, and encryption metadata are retained only as necessary metadata for authorization, weekly enforcement, and history presentation.

The new Edge Function authenticates the caller, verifies they belong to the supplied couple, and always writes `submitted_by` from the authenticated identity. It reuses the existing author-or-partner visibility model for reads; it never accepts another person's identity, bypasses row-level protections, or grants Circle of Friends access. The database's exclusion constraint remains the final concurrency-safe weekly-limit enforcement, even if two requests arrive together.

## API and Client Flow

1. The user opens Mental Monitoring in their partner space and sees the persistent monitoring-not-diagnosis notice.
2. The temporary card accepts a date and three final scores. It states that results are visible only to the user and their partner and are not shared with Circle of Friends.
3. The client calls the dedicated backfill Edge Function with the couple ID, date-only value, and three scores. It does not send answers, a timestamp, a user ID, a severity label, or encryption material.
4. The function validates the strict request shape and date, converts the date to 00:00 Asia/Manila, validates the scores, checks authorization, encrypts the score bundle, and inserts the record.
5. The database trigger and exclusion constraint derive and protect the assessment window. A conflict returns a neutral message that another entry is within seven days; it does not disclose a partner's details.
6. On success, the client refreshes the existing history. History responses expose `takenAt` rather than treating the audit `created_at` value as the assessment date.

Normal assessment creation continues to send only computed scores and uses the same encryption and authorization path. Its history, charts, eligibility messaging, CSV export, and PDF export are updated to use `takenAt`, so all views show the correct date for both new and backfilled entries.

## Error Handling

- The card prevents obvious invalid input locally for usability, but every rule is duplicated and authoritative in the Edge Function and database.
- Server validation returns appropriate client-safe errors for malformed data, dates after today, impossible score values, missing couple membership, and seven-day conflicts.
- Failures do not reveal plaintext scores, another user's history, encryption keys, or Circle of Friends data.
- If the historical insert succeeds but the history refresh fails, the client retains the normal error state and can safely refresh again; the database constraint prevents an accidental duplicate within seven days.

## Temporary-Feature Removal

After the user confirms that historical data entry is finished, remove the temporary card, its form logic, hook, tests, and `backfill-dass-monitoring-entry` Edge Function deployment. Do not remove the `taken_at` migration or alter historical rows: that field is the permanent authoritative assessment date used by trends and exports.

## Verification

- Add migration contract tests for the new `taken_at` field, backfill-safe trigger behavior, audit-time check, and seven-day exclusion derived from assessment time.
- Add Edge Function tests for strict date/score validation, Asia/Manila date conversion, authenticated-user ownership, couple authorization, encryption-only persistence, and conflict handling.
- Extend history and report tests to verify `takenAt` is returned and used for charts, CSV, and PDF dates.
- Add page tests verifying the temporary card appears only in a partner space, sends only final scores and a date, repeats the privacy and monitoring notices, and is isolated enough to remove without affecting normal assessment or history behavior.
- Run the focused Node and Deno test suites, TypeScript checking, and a production build. Render a representative PDF with a historical record to confirm its date, table, and chart remain legible.

## Non-goals

- Completing or saving a historical 21-question questionnaire.
- Allowing future entries, closer-than-seven-day entries, direct database editing from the browser, or backfilling for another person.
- Storing individual answers, diagnoses, overall-status values, or encryption keys.
- Changing Circle of Friends access or deploying the pending database migration sequence without explicit approval.
