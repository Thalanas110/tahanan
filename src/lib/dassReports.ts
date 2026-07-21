import {
  getDassSeverity,
  type DassScores,
  type DassSeverity,
} from './dass21.ts';
import type { DassMonitoringEntry } from '../types/dassMonitoring.ts';

export interface DassReportRow extends DassScores {
  dateTaken: string;
  overallStatus: DassSeverity;
}

const severityOrder: DassSeverity[] = [
  'Normal',
  'Mild',
  'Moderate',
  'Severe',
  'Extremely Severe',
];

export function getOverallDassStatus(scores: DassScores): DassSeverity {
  return (['depression', 'anxiety', 'stress'] as const)
    .map((scale) => getDassSeverity(scale, scores[scale]))
    .reduce((highest, next) =>
      severityOrder.indexOf(next) > severityOrder.indexOf(highest)
        ? next
        : highest,
    );
}

export function buildDassReportRows(
  entries: readonly DassMonitoringEntry[],
): DassReportRow[] {
  return entries.map(({ createdAt, depression, anxiety, stress }) => ({
    dateTaken: createdAt,
    depression,
    anxiety,
    stress,
    overallStatus: getOverallDassStatus({ depression, anxiety, stress }),
  }));
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function serializeDassCsv(rows: readonly DassReportRow[]) {
  return [
    ['Date taken', 'Depression', 'Anxiety', 'Stress', 'Overall status'],
    ...rows.map((row) => [
      row.dateTaken,
      row.depression,
      row.anxiety,
      row.stress,
      row.overallStatus,
    ]),
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');
}

export function getDassReportFilename(
  extension: 'csv' | 'pdf',
  now = new Date(),
) {
  return `dass-21-monitoring-report-${now.toISOString().slice(0, 10)}.${extension}`;
}
