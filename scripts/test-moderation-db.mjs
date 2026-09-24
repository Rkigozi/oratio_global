import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Uses a disposable PostgreSQL cluster and never reads a Supabase connection string.
const root = fileURLToPath(new URL('../', import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'oratio-moderation-'));
const data = join(temp, 'data');
let started = false;
const run = (cmd, args, input) =>
  execFileSync(cmd, args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
const sql = (input) =>
  run('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-h', temp, '-p', '55439', '-d', 'postgres'], input);
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
    sql(readFileSync(join(root, 'supabase/migrations', file), 'utf8'));
  }
  const assertions = readFileSync(join(root, 'supabase/tests/moderation.sql'), 'utf8');
  sql(assertions);
  const count = assertions.match(/^select pg_temp\.(?:assert_true|expect_error)\(/gm)?.length ?? 0;
  console.log(`All migrations applied; ${count} moderation database assertions passed.`);
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
} finally {
  if (started) run('pg_ctl', ['-D', data, '-m', 'immediate', '-w', 'stop']);
  rmSync(temp, { recursive: true, force: true });
}
