import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDassReportRows,
  getDassReportFilename,
  getOverallDassStatus,
  serializeDassCsv,
} from './dassReports.ts';

test('overall status uses the highest severity across all DASS scales', () => {
  assert.equal(
    getOverallDassStatus({ depression: 10, anxiety: 20, stress: 15 }),
    'Extremely Severe',
  );
  assert.equal(
    getOverallDassStatus({ depression: 9, anxiety: 7, stress: 14 }),
    'Normal',
  );
});

test('report rows contain only a taken date, final scores, and overall status', () => {
  assert.deepEqual(
    buildDassReportRows([
      {
        id: 'entry-1',
        submittedBy: 'person-1',
        createdAt: '2026-07-21T06:00:00.000Z',
        depression: 10,
        anxiety: 8,
        stress: 16,
      },
    ]),
    [
      {
        dateTaken: '2026-07-21T06:00:00.000Z',
        depression: 10,
        anxiety: 8,
        stress: 16,
        overallStatus: 'Mild',
      },
    ],
  );
});

test('CSV has the requested headers and final score fields', () => {
  assert.equal(
    serializeDassCsv([
      {
        dateTaken: '2026-07-21T06:00:00.000Z',
        depression: 10,
        anxiety: 8,
        stress: 16,
        overallStatus: 'Mild',
      },
    ]),
    'Date taken,Depression,Anxiety,Stress,Overall status\r\n' +
      '2026-07-21T06:00:00.000Z,10,8,16,Mild',
  );
});

test('report filenames are deterministic and limited to csv or pdf', () => {
  const now = new Date('2026-07-21T12:00:00.000Z');
  assert.equal(
    getDassReportFilename('csv', now),
    'dass-21-monitoring-report-2026-07-21.csv',
  );
  assert.equal(
    getDassReportFilename('pdf', now),
    'dass-21-monitoring-report-2026-07-21.pdf',
  );
});
