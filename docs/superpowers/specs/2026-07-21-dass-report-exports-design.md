# DASS-21 Report Exports Design

## Purpose

Allow a person in their partner space to export the DASS-21 monitoring history they are already authorized to view as CSV or PDF. Exports are monitoring records, not diagnoses.

## Scope

- Add `Export CSV` and `Export PDF` actions to the Mental Monitoring score-trends card when at least one score record is available.
- Export only the already-filtered partner-space history returned by `useDassMonitoring`. The exports include no questionnaire ratings, text, encryption metadata, identifiers, or Circle of Friends data.
- CSV columns are `Date taken`, `Depression`, `Anxiety`, `Stress`, and `Overall status`.
- `Overall status` is the highest conventional severity band among an entry's Depression, Anxiety, and Stress scores. It is an explicitly non-diagnostic monitoring label.
- The PDF includes a DASS-21 Monitoring Report heading, a monitoring-not-diagnosis and consult-a-professional notice, the same score table, a three-line 0-42 score-trend chart, and a note that the file contains sensitive final scores only.
- Both exports are created in browser memory from the current authorized history and downloaded directly. No export is uploaded, logged, stored, cached, sent to an Edge Function, or added to the database.

## Architecture

`src/lib/dassReports.ts` is a pure report-model module. It receives `DassMonitoringEntry` records and provides:

- a deterministic overall-status calculation using the existing DASS severity function;
- typed report rows and CSV serialization with correct value escaping;
- safe report filenames derived from the export date.

`src/lib/dassPdfReport.ts` renders the report from report rows with the existing `jspdf` dependency. It draws the trend chart directly into the PDF, avoiding canvas capture of the UI and keeping the report independent of React rendering state.

`mental-monitoring.tsx` invokes these helpers from the score-trends card. It uses the already-authorized, client-filtered `visibleEntries` array and reports export failures through the existing toast pattern. Export controls are absent in a COF room because the entire page remains unavailable there.

## Privacy and safety

- The report uses only final scores decrypted by the existing server-side history endpoint after author-or-partner authorization.
- The browser does not receive, persist, or export individual questionnaire ratings.
- A downloaded report is a user-controlled local file. The UI warns that it contains sensitive information before the user exports it.
- The PDF and the source page repeat that DASS-21 is for monitoring rather than diagnosis and recommend consulting a doctor or qualified mental-health professional if concerns continue.

## Error handling

- Hide export controls for an empty history.
- If generating either file fails, keep the displayed history unchanged and show a neutral error toast.
- A malformed score row is rejected by the pure report helper rather than producing an incomplete report.

## Verification

- Unit-test report-row creation, all overall-status tie and severity cases, deterministic filenames, and CSV escaping/headers.
- Unit-test PDF generation for a non-empty report and assert its output is a PDF document containing the report title and monitoring disclaimer.
- Render a representative generated PDF to PNG and inspect its table and chart for clipping, overlap, and readable labels.
- Add a UI source contract verifying that both export controls use the report helpers and not direct database calls.
- Type-check and production-build the application.

## Non-goals

- Server-generated reports, new Edge Functions, database changes, scheduled reports, or report storage.
- Exporting DASS-21 question ratings or presenting an overall diagnosis.
