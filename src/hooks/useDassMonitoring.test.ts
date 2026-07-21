import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const hookPath = new URL('./useDassMonitoring.ts', import.meta.url);

test('DASS client hook uses server endpoints and never handles persistence or encryption keys', () => {
  assert.equal(existsSync(hookPath), true);

  const source = readFileSync(hookPath, 'utf8');
  assert.match(source, /invokeEdgeFunction/);
  assert.match(source, /create-dass-monitoring-entry/);
  assert.match(source, /get-dass-monitoring-history/);
  assert.doesNotMatch(source, /backfill/i);
  assert.doesNotMatch(
    source,
    /from\('dass_monitoring_entries'\)|AES|kek|encryptionKey|responses|answers/,
  );
});
