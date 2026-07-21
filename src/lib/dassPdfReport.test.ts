import assert from 'node:assert/strict';
import test from 'node:test';

import { createDassPdfReport } from './dassPdfReport.ts';

const rows = [
  {
    dateTaken: '2026-07-21T06:00:00.000Z',
    depression: 10,
    anxiety: 8,
    stress: 16,
    overallStatus: 'Mild' as const,
  },
];

test('DASS PDF includes its title and monitoring disclaimer', () => {
  const document = createDassPdfReport(rows, new Date('2026-07-21T12:00:00.000Z'));
  const content = Buffer.from(document.output('arraybuffer')).toString('latin1');

  assert.match(content, /DASS-21 Monitoring Report/);
  assert.match(content, /monitoring tool, not a diagnosis/i);
  assert.match(content, /consult a doctor/i);
  assert.match(content, /Date taken/);
  assert.match(content, /Score trends/);
});

test('DASS PDF retains a supplied Manila calendar date', () => {
  const document = createDassPdfReport([
    {
      ...rows[0],
      dateTaken: '2026-01-05',
    },
  ]);
  const content = Buffer.from(document.output('arraybuffer')).toString('latin1');

  assert.match(content, /2026-01-05/);
});

test('DASS PDF output starts with the PDF signature', () => {
  const document = createDassPdfReport(rows);

  assert.equal(
    Buffer.from(document.output('arraybuffer')).subarray(0, 4).toString(),
    '%PDF',
  );
});
