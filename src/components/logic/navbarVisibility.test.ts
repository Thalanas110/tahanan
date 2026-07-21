import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

const helperPath = new URL('./navbarVisibility.ts', import.meta.url);

test('Mental Monitoring navigation is hidden outside the partner space', async () => {
  assert.equal(existsSync(helperPath), true);

  const { isMoreNavItemVisible } = await import('./navbarVisibility.ts');
  const mentalMonitoring = { partnerOnly: true };

  assert.equal(isMoreNavItemVisible(mentalMonitoring, true, 'partner'), true);
  assert.equal(isMoreNavItemVisible(mentalMonitoring, true, 'cof'), false);
});
