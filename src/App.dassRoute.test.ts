import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appPath = new URL('./App.tsx', import.meta.url);

test('Mental Monitoring is protected by the application route', () => {
  const source = readFileSync(appPath, 'utf8');
  assert.match(source, /import MentalMonitoring from "\.\/pages\/mental-monitoring"/);
  assert.match(
    source,
    /<Route path="\/mental-monitoring">\s*<ProtectedRoute>\s*<AppLayout>\s*<MentalMonitoring \/>/,
  );
});
