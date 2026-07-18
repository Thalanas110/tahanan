import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const migrationsDir = dirname(fileURLToPath(import.meta.url));

function latestJoinCoupleDefinition() {
  const migrationNames = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  let latest = '';
  for (const name of migrationNames) {
    const sql = readFileSync(join(migrationsDir, name), 'utf8');
    if (sql.includes('create or replace function public.join_couple_by_code')) {
      latest = sql;
    }
  }

  return latest;
}

test('latest join_couple_by_code rpc matches the separated COF schema', () => {
  const definition = latestJoinCoupleDefinition();

  assert.notEqual(definition, '', 'expected a join_couple_by_code definition');
  assert.doesNotMatch(definition, /\bcouple_type\b/);
  assert.doesNotMatch(definition, /\btarget_couple\.type\b/);
  assert.match(
    definition,
    /insert into (?:public\.)?couple_members\s*\(\s*couple_id\s*,\s*user_id\s*,\s*role\s*\)/i,
  );
  assert.match(
    definition,
    /update public\.monthsary_messages[\s\S]*where monthsary_messages\.couple_id\s*=\s*target_couple\.id/i,
  );
  assert.doesNotMatch(definition, /\bwhere\s+couple_id\s*=\s*target_couple\.id\b/i);
});
