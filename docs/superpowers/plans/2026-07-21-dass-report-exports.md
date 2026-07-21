# DASS-21 Report Exports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export authorized DASS-21 score history as CSV and a non-diagnostic PDF report containing a score table and three-line trend chart.

**Architecture:** Use the existing browser-authorized `visibleEntries` array. A pure report module derives a highest-severity monitoring status and creates CSV. A separate jsPDF module renders a table, disclaimer, and vector chart entirely in browser memory. No answers, database writes, migrations, Edge Functions, logs, or storage are involved.

**Tech Stack:** React 19, TypeScript, jsPDF 4, Node built-in test runner, Vite.

## Global Constraints

- CSV columns are exactly Date taken, Depression, Anxiety, Stress, and Overall status.
- Overall status is the highest of the existing conventional severity bands; it is not a diagnosis.
- Exclude question ratings, free text, IDs, partner names, COF data, keys, and encryption metadata.
- PDF states that DASS-21 is a monitoring tool, not a diagnosis, and says to consult a doctor or qualified mental-health professional if concerns continue.
- Generate and download files in browser memory only.
- Reuse the page's Organic sage/terracotta rounded-card style and warn that the report is sensitive.

---

## File Structure

- Create `src/lib/dassReports.ts`: typed rows, status derivation, CSV, filename helper.
- Create `src/lib/dassReports.test.ts`: pure export-model tests.
- Create `src/lib/dassPdfReport.ts`: jsPDF table, disclaimer, and chart.
- Create `src/lib/dassPdfReport.test.ts`: PDF text and signature tests.
- Modify `src/pages/mental-monitoring.tsx`: export buttons and browser blob downloads.
- Modify `src/pages/mental-monitoring.test.ts`: export and privacy source contract.

### Task 1: Report rows and CSV

**Files:** Create `src/lib/dassReports.ts`, `src/lib/dassReports.test.ts`.

**Interfaces:** Consume `DassMonitoringEntry`, `DassScores`, `DassSeverity`, and `getDassSeverity`. Produce `DassReportRow`, `getOverallDassStatus(scores)`, `buildDassReportRows(entries)`, `serializeDassCsv(rows)`, and `getDassReportFilename(extension, now?)`.

- [ ] **Step 1: Write failing tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDassReportRows, getDassReportFilename, getOverallDassStatus, serializeDassCsv } from './dassReports.ts';

test('overall status uses the highest severity', () => {
  assert.equal(getOverallDassStatus({ depression: 10, anxiety: 20, stress: 15 }), 'Extremely Severe');
  assert.equal(getOverallDassStatus({ depression: 9, anxiety: 7, stress: 14 }), 'Normal');
});
test('report rows contain score data only', () => {
  assert.deepEqual(buildDassReportRows([{ id: 'entry-1', submittedBy: 'person-1', createdAt: '2026-07-21T06:00:00.000Z', depression: 10, anxiety: 8, stress: 16 }]), [{ dateTaken: '2026-07-21T06:00:00.000Z', depression: 10, anxiety: 8, stress: 16, overallStatus: 'Mild' }]);
});
test('CSV contains required headers and escaped cells', () => {
  assert.equal(serializeDassCsv([{ dateTaken: '2026-07-21T06:00:00.000Z', depression: 10, anxiety: 8, stress: 16, overallStatus: 'Mild, monitoring' }]), 'Date taken,Depression,Anxiety,Stress,Overall status\r\n2026-07-21T06:00:00.000Z,10,8,16,"Mild, monitoring"');
});
test('filenames use the generated date', () => {
  const now = new Date('2026-07-21T12:00:00.000Z');
  assert.equal(getDassReportFilename('csv', now), 'dass-21-monitoring-report-2026-07-21.csv');
  assert.equal(getDassReportFilename('pdf', now), 'dass-21-monitoring-report-2026-07-21.pdf');
});
```

- [ ] **Step 2: Verify red**

Run `node --experimental-strip-types --test src/lib/dassReports.test.ts`. Expect failure because `dassReports.ts` is absent.

- [ ] **Step 3: Implement the pure report module**

```ts
import { getDassSeverity, type DassScores, type DassSeverity } from './dass21';
import type { DassMonitoringEntry } from '@/types/dassMonitoring';
export interface DassReportRow extends DassScores { dateTaken: string; overallStatus: DassSeverity; }
const severityOrder: DassSeverity[] = ['Normal', 'Mild', 'Moderate', 'Severe', 'Extremely Severe'];
export function getOverallDassStatus(scores: DassScores): DassSeverity {
  return (['depression', 'anxiety', 'stress'] as const).map((scale) => getDassSeverity(scale, scores[scale])).reduce((highest, next) => severityOrder.indexOf(next) > severityOrder.indexOf(highest) ? next : highest);
}
export function buildDassReportRows(entries: readonly DassMonitoringEntry[]): DassReportRow[] {
  return entries.map(({ createdAt, depression, anxiety, stress }) => ({ dateTaken: createdAt, depression, anxiety, stress, overallStatus: getOverallDassStatus({ depression, anxiety, stress }) }));
}
const csvCell = (value: string | number) => /[",\r\n]/.test(String(value)) ? `"${String(value).replaceAll('"', '""')}"` : String(value);
export function serializeDassCsv(rows: readonly DassReportRow[]) {
  return [['Date taken', 'Depression', 'Anxiety', 'Stress', 'Overall status'], ...rows.map((row) => [row.dateTaken, row.depression, row.anxiety, row.stress, row.overallStatus])].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
export function getDassReportFilename(extension: 'csv' | 'pdf', now = new Date()) { return `dass-21-monitoring-report-${now.toISOString().slice(0, 10)}.${extension}`; }
```

- [ ] **Step 4: Verify green and commit**

Run `node --experimental-strip-types --test src/lib/dassReports.test.ts`. Expect 4 passing tests.

```bash
git add src/lib/dassReports.ts src/lib/dassReports.test.ts
git commit -m "feat: add DASS report data exports"
```

### Task 2: PDF report with table and trend chart

**Files:** Create `src/lib/dassPdfReport.ts`, `src/lib/dassPdfReport.test.ts`.

**Interfaces:** Consume `DassReportRow`. Produce `createDassPdfReport(rows, generatedAt?)` returning `jsPDF` and `getDassPdfBlob(rows, generatedAt?)` returning `Blob`.

- [ ] **Step 1: Write failing tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { createDassPdfReport } from './dassPdfReport.ts';
const rows = [{ dateTaken: '2026-07-21T06:00:00.000Z', depression: 10, anxiety: 8, stress: 16, overallStatus: 'Mild' as const }];
test('PDF includes title and monitoring disclaimer', () => {
  const content = Buffer.from(createDassPdfReport(rows).output('arraybuffer')).toString('latin1');
  assert.match(content, /DASS-21 Monitoring Report/);
  assert.match(content, /monitoring tool, not a diagnosis/i);
  assert.match(content, /consult a doctor/i);
});
test('PDF output has a valid signature', () => {
  assert.equal(Buffer.from(createDassPdfReport(rows).output('arraybuffer')).subarray(0, 4).toString(), '%PDF');
});
```

- [ ] **Step 2: Verify red**

Run `node --experimental-strip-types --test src/lib/dassPdfReport.test.ts`. Expect failure because `dassPdfReport.ts` is absent.

- [ ] **Step 3: Implement jsPDF rendering**

```ts
import { jsPDF } from 'jspdf';
import type { DassReportRow } from './dassReports';
const keys = ['depression', 'anxiety', 'stress'] as const;
const colors = { depression: '#C66B3D', anxiety: '#B06A7A', stress: '#606C38' };
export function createDassPdfReport(rows: readonly DassReportRow[], generatedAt = new Date()) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: false }); const left = 16;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18); pdf.text('DASS-21 Monitoring Report', left, 20);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.text(`Generated ${generatedAt.toISOString().slice(0, 10)}`, left, 27);
  pdf.text(pdf.splitTextToSize('DASS-21 is a monitoring tool, not a diagnosis. Consult a doctor or qualified mental-health professional if concerns continue.', 178), left, 35);
  const headers = ['Date taken', 'Depression', 'Anxiety', 'Stress', 'Overall status']; const x = [16, 64, 89, 111, 131]; let y = 54;
  pdf.setFont('helvetica', 'bold'); headers.forEach((header, index) => pdf.text(header, x[index], y)); pdf.setFont('helvetica', 'normal');
  rows.forEach((row) => { y += 7; if (y > 184) { pdf.addPage(); y = 20; } [row.dateTaken.slice(0, 10), row.depression, row.anxiety, row.stress, row.overallStatus].forEach((value, index) => pdf.text(String(value), x[index], y)); });
  if (y > 128) { pdf.addPage(); y = 20; } const top = y + 16; const width = 178; const height = 62;
  pdf.setFont('helvetica', 'bold'); pdf.text('Score trends', left, top - 7); pdf.rect(left, top, width, height);
  [0, 14, 28, 42].forEach((score) => { const lineY = top + height - score / 42 * height; pdf.setDrawColor('#D4B895'); pdf.line(left, lineY, left + width, lineY); pdf.text(String(score), left - 7, lineY + 1); });
  keys.forEach((key) => { pdf.setDrawColor(colors[key]); rows.slice(1).forEach((row, index) => { const count = Math.max(rows.length - 1, 1); pdf.line(left + index / count * width, top + height - rows[index][key] / 42 * height, left + (index + 1) / count * width, top + height - row[key] / 42 * height); }); });
  pdf.setTextColor('#000000'); pdf.setFontSize(8); pdf.text('Sensitive final scores only. Keep this report private.', left, 282); return pdf;
}
export function getDassPdfBlob(rows: readonly DassReportRow[], generatedAt = new Date()) { return createDassPdfReport(rows, generatedAt).output('blob'); }
```

- [ ] **Step 4: Verify green, render, inspect, and commit**

Run `node --experimental-strip-types --test src/lib/dassPdfReport.test.ts`. Expect 2 passing tests.

Generate a one-row fixture under `tmp/pdfs`, render it with `pdftoppm -png`, and inspect the PNG with `view_image`. Expected: readable disclaimer, aligned table, 0/14/28/42 labels, three lines, and visible sensitive-file footer.

```bash
git add src/lib/dassPdfReport.ts src/lib/dassPdfReport.test.ts
git commit -m "feat: add DASS PDF report export"
```

### Task 3: Add safe client export controls

**Files:** Modify `src/pages/mental-monitoring.tsx`, `src/pages/mental-monitoring.test.ts`.

**Interfaces:** Consume report helpers and the existing `visibleEntries`. Produce browser downloads only if history is non-empty.

- [ ] **Step 1: Extend the failing page contract test**

```ts
assert.match(source, /buildDassReportRows/);
assert.match(source, /serializeDassCsv/);
assert.match(source, /getDassPdfBlob/);
assert.match(source, /Export CSV/);
assert.match(source, /Export PDF/);
assert.match(source, /Sensitive report/);
assert.doesNotMatch(source, /from\('dass_monitoring_entries'\)|functions\.invoke\('.*export/);
```

- [ ] **Step 2: Verify red**

Run `node --experimental-strip-types --test src/pages/mental-monitoring.test.ts`. Expect failure because the controls are absent.

- [ ] **Step 3: Implement local download handlers and controls**

```ts
import { Download, FileText } from 'lucide-react';
import { getDassPdfBlob } from '@/lib/dassPdfReport';
import { buildDassReportRows, getDassReportFilename, serializeDassCsv } from '@/lib/dassReports';
function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
const reportRows = buildDassReportRows(visibleEntries);
const exportCsv = () => { try { downloadBlob(new Blob([serializeDassCsv(reportRows)], { type: 'text/csv;charset=utf-8' }), getDassReportFilename('csv')); } catch { toast.error('Could not create the CSV report.'); } };
const exportPdf = () => { try { downloadBlob(getDassPdfBlob(reportRows), getDassReportFilename('pdf')); } catch { toast.error('Could not create the PDF report.'); } };
```

Render the following only when `reportRows.length > 0`, immediately above the chart:

```tsx
<div className="flex flex-col gap-3 rounded-xl bg-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between">
  <p className="text-sm text-muted-foreground">Sensitive report: it includes final DASS-21 scores for this partner space. Keep downloaded files private.</p>
  <div className="flex shrink-0 gap-2">
    <Button type="button" variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
    <Button type="button" variant="outline" onClick={exportPdf}><FileText className="mr-2 h-4 w-4" />Export PDF</Button>
  </div>
</div>
```

- [ ] **Step 4: Verify green and commit**

Run `node --experimental-strip-types --test src/pages/mental-monitoring.test.ts` and `npm.cmd run typecheck`. Expect both to exit 0.

```bash
git add src/pages/mental-monitoring.tsx src/pages/mental-monitoring.test.ts
git commit -m "feat: add DASS report export controls"
```

### Task 4: Full verification and cleanup

**Files:** Verify the above source files. Do not retain generated fixtures.

- [ ] **Step 1: Run focused tests**

Run `node --experimental-strip-types --test src/lib/dass21.test.ts src/lib/dassReports.test.ts src/lib/dassPdfReport.test.ts src/pages/mental-monitoring.test.ts`. Expect all tests to pass.

- [ ] **Step 2: Run application checks**

Run `npm.cmd run typecheck`, `npm.cmd run build`, and `git diff --check`. Expect all to exit 0; record any pre-existing Vite chunk-size warning separately.

- [ ] **Step 3: Delete only generated visual-test artifacts**

Run `Remove-Item -LiteralPath 'C:\Users\Adriaan M. Dimate\Desktop\development\personal\tahanan\tmp\pdfs' -Recurse -Force` only after confirming that exact directory contains generated PDF fixture output. Expect no fixture PDF or PNG to remain.

