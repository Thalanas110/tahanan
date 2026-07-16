import assert from 'node:assert/strict';
import test from 'node:test';

import config from './capacitor.config.ts';

test('android input capture stays disabled so WebView text editing remains native', () => {
  assert.notEqual(config.android?.captureInput, true);
});
