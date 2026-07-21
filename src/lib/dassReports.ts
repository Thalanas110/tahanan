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

export type DassReportScope = 'last-5-months' | 'all-time';

const severityOrder: DassSeverity[] = [
  'Normal',
  'Mild',
  'Moderate',
  'Severe',
  'Extremely Severe',
];

function toDassDate(value: string | Date): Date {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid DASS assessment timestamp');
  }
  return date;
}

export function getDassTakenDate(value: string | Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(toDassDate(value));
  const part = (type: 'year' | 'month' | 'day') => {
    const result = parts.find((candidate) => candidate.type === type)?.value;
    if (!result) throw new Error('Could not format DASS assessment date');
    return result;
  };

  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function formatDassTakenDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
  }).format(toDassDate(value));
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getRecentDassWindowStart(now: Date): string {
  const [year, month, day] = getDassTakenDate(now).split('-').map(Number);
  const monthIndex = year * 12 + month - 1 - 5;
  const targetYear = Math.floor(monthIndex / 12);
  const targetMonth = (monthIndex % 12) + 1;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

export function filterDassEntriesToRecentMonths(
  entries: readonly DassMonitoringEntry[],
  now = new Date(),
): DassMonitoringEntry[] {
  const startDate = getRecentDassWindowStart(now);
  const endDate = getDassTakenDate(now);

  return entries.filter((entry) => {
    const takenDate = getDassTakenDate(entry.takenAt);
    return takenDate >= startDate && takenDate <= endDate;
  });
}

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
  return entries.map(({ takenAt, depression, anxiety, stress }) => ({
    dateTaken: getDassTakenDate(takenAt),
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
  scope?: DassReportScope,
) {
  const scopeSuffix = scope ? `-${scope}` : '';
  return `dass-21-monitoring-report-${now.toISOString().slice(0, 10)}${scopeSuffix}.${extension}`;
}
