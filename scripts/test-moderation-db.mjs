import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { testBlockingConcurrency } from './test-blocking-concurrency.mjs';
import { testRateLimitConcurrency } from './test-rate-limit-concurrency.mjs';
import { testPrayerRenewalConcurrency } from './test-prayer-renewal-concurrency.mjs';

// Uses a disposable PostgreSQL cluster and never reads a Supabase connection string.
const root = fileURLToPath(new URL('../', import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'oratio-moderation-'));
const data = join(temp, 'data');
let started = false;
const run = (cmd, args, input) =>
  execFileSync(cmd, args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
const psqlArgs = [
  '-X',
  '-v',
  'ON_ERROR_STOP=1',
  '-At',
  '-h',
  temp,
  '-p',
  '55439',
  '-d',
  'postgres',
];
const sql = (input) => run('psql', psqlArgs, input);
try {
  run('initdb', ['-D', data, '--auth=trust', '--no-locale', '--encoding=UTF8']);
  run('pg_ctl', [
    '-D',
    data,
    '-l',
    join(temp, 'postgres.log'),
    '-o',
    `-k ${temp} -p 55439 -c listen_addresses=''`,
    '-w',
    'start',
  ]);
  started = true;
  sql(readFileSync(join(root, 'supabase/tests/local-bootstrap.sql'), 'utf8'));
  for (const file of readdirSync(join(root, 'supabase/migrations'))
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    if (file === '043_public_prayer_expiry.sql')
      sql(readFileSync(join(root, 'supabase/tests/prayer-expiry-before-rollout.sql'), 'utf8'));
    if (file === '044_prayer_place_catalog.sql')
      sql(readFileSync(join(root, 'supabase/tests/prayer-places-before-rollout.sql'), 'utf8'));
    sql(readFileSync(join(root, 'supabase/migrations', file), 'utf8'));
    if (file === '043_public_prayer_expiry.sql') {
      sql(readFileSync(join(root, 'supabase/tests/prayer-expiry-after-rollout.sql'), 'utf8'));
      console.log(
        'Public expiry rollout: legacy prayers receive a full window; other spaces stay unchanged.'
      );
    }
    if (file === '045_prayer_place_catalog_data.sql') {
      sql(readFileSync(join(root, 'supabase/tests/prayer-places-after-rollout.sql'), 'utf8'));
      console.log(
        'Place rollout: prayer history preserved; known cities canonicalized; private/unverified locations stripped.'
      );
    }
  }
  for (const suite of [
    'security',
    'moderation',
    'blocking',
    'prayer-expiry',
    'prayer-places',
    'location-pagination',
    'prayer-submission-retries',
  ]) {
    const assertions = readFileSync(join(root, `supabase/tests/${suite}.sql`), 'utf8');
    sql(assertions);
    const count =
      assertions.match(/^select pg_temp\.(?:assert_true|expect_error)\(/gm)?.length ?? 0;
    console.log(`All migrations applied; ${count} ${suite} database assertions passed.`);
  }
  await testBlockingConcurrency({ sql, psqlArgs });
  await testRateLimitConcurrency({ sql, psqlArgs });
  await testPrayerRenewalConcurrency({ sql, psqlArgs });
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
} finally {
  if (started) run('pg_ctl', ['-D', data, '-m', 'immediate', '-w', 'stop']);
  rmSync(temp, { recursive: true, force: true });
}
