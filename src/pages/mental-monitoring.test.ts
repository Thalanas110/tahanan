import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const pagePath = new URL('./mental-monitoring.tsx', import.meta.url);

test('Mental Monitoring displays the DASS safety disclosure and uses only the server-backed monitoring hook', () => {
  assert.equal(existsSync(pagePath), true);

  const source = readFileSync(pagePath, 'utf8');
  assert.match(source, /monitoring tool, not a diagnosis/i);
  assert.match(source, /consult a doctor/i);
  assert.match(source, /only you and your partner/i);
  assert.match(source, /useDassMonitoring/);
  assert.match(source, /LineChart/);
  assert.doesNotMatch(source, /from\('dass_monitoring_entries'\)|VITE_.*(?:KEY|SECRET)/);
});
