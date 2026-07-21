import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const writer = readFileSync(
  new URL('./create-dass-monitoring-entry/index.ts', import.meta.url),
  'utf8',
);
const reader = readFileSync(
  new URL('./get-dass-monitoring-history/index.ts', import.meta.url),
  'utf8',
);

test('DASS writer verifies authenticated partner-couple membership before encrypting', () => {
  assert.match(writer, /userClient\(req\)/);
  assert.match(writer, /parseCreateDassBody\(await req\.json\(\)\)/);
  assert.match(
    writer,
    /from\('couple_members'\)[\s\S]*eq\('couple_id', coupleId\)[\s\S]*eq\('user_id', user\.id\)/,
  );
  assert.match(writer, /rpc\(\s*'dass_monitoring_get_kek'/);
  assert.match(writer, /encryptDassScores\(scores/);
  assert.match(writer, /insertError\?\.code === '23P01'/);
  assert.doesNotMatch(writer, /cofId|roomType|responses|answers/);
});

test('DASS reader proves caller membership before decrypting history', () => {
  assert.match(reader, /userClient\(req\)/);
  assert.match(reader, /parseHistoryDassBody\(await req\.json\(\)\)/);
  assert.match(reader, /from\('couple_members'\)/);
  assert.match(reader, /memberIds\.includes\(user\.id\)/);
  assert.match(reader, /canReadDassEntry/);
  assert.match(reader, /rpc\(\s*'dass_monitoring_get_kek'/);
  assert.match(reader, /decryptDassScores/);
  assert.doesNotMatch(reader, /cofId|roomType|recipientId|responses|answers/);
});
