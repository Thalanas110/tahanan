import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(
  new URL('./0017_dass_monitoring.sql', import.meta.url),
  'utf8',
);
const tableDefinition = sql.match(
  /create table if not exists public\.dass_monitoring_entries\s*\(([\s\S]*?)\n\);/i,
)?.[1];
const takenAtMigrationPath = new URL('./0018_dass_monitoring_taken_at.sql', import.meta.url);

test('DASS monitoring stores ciphertext only with no COF or plaintext score columns', () => {
  assert.match(
    sql,
    /create table if not exists public\.dass_monitoring_entries/i,
  );
  assert.match(sql, /ciphertext text not null/i);
  assert.match(sql, /wrapped_data_key text not null/i);
  assert.ok(tableDefinition, 'expected DASS monitoring table definition');
  assert.doesNotMatch(
    tableDefinition,
    /\b(cof_id|answers|responses|depression\s+int|anxiety\s+int|stress\s+int)\b/i,
  );
});

test('DASS monitoring denies direct Data API and KEK RPC access', () => {
  assert.match(
    sql,
    /alter table public\.dass_monitoring_entries enable row level security/i,
  );
  assert.match(
    sql,
    /revoke all on table public\.dass_monitoring_entries from anon, authenticated/i,
  );
  assert.doesNotMatch(sql, /create policy/i);
  assert.match(
    sql,
    /revoke all on function public\.dass_monitoring_get_kek\(text\)\s+from public, anon, authenticated/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.dass_monitoring_get_kek\(text\) to service_role/i,
  );
});

test('DASS monitoring creates its KEK in Vault and enforces a rolling seven-day window', () => {
  assert.match(sql, /create extension if not exists supabase_vault/i);
  assert.match(
    sql,
    /vault\.create_secret\([\s\S]*encode\(gen_random_bytes\(32\), 'base64'\)/i,
  );
  assert.match(sql, /create extension if not exists btree_gist/i);
  assert.match(
    sql,
    /exclude using gist\s*\(\s*submitted_by with =,\s*assessment_window with &&\s*\)/i,
  );
  assert.match(sql, /interval '7 days'/i);
});

test('DASS assessment time is immutable metadata and drives the weekly window', () => {
  assert.equal(
    existsSync(takenAtMigrationPath),
    true,
    'expected an additive DASS assessment-time migration',
  );

  const takenAtSql = readFileSync(takenAtMigrationPath, 'utf8');
  assert.match(takenAtSql, /add column taken_at timestamptz/i);
  assert.match(
    takenAtSql,
    /update public\.dass_monitoring_entries\s+set taken_at = created_at/i,
  );
  assert.match(takenAtSql, /alter column taken_at set not null/i);
  assert.match(takenAtSql, /check \(taken_at <= created_at\)/i);
  assert.match(
    takenAtSql,
    /new\.taken_at := coalesce\(new\.taken_at, new\.created_at\)/i,
  );
  assert.match(
    takenAtSql,
    /tstzrange\(\s*new\.taken_at,\s*new\.taken_at \+ interval '7 days'/i,
  );
  assert.doesNotMatch(
    takenAtSql,
    /\b(answers|responses|depression\s+int|anxiety\s+int|stress\s+int)\b/i,
  );
});
