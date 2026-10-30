import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

// Two real transactions contend for the last slot in a disposable cluster.
export async function testRateLimitConcurrency({ sql, psqlArgs }) {
  const user = '30000000-0000-0000-0000-000000000001';
  const session = (name) => {
    const child = spawn('psql', psqlArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    child.stdout.resume();
    child.stderr.on('data', (chunk) => (stderr += chunk));
    const done = new Promise((resolve) => {
      child.on('error', (error) => resolve({ code: -1, stderr: error.message }));
      child.on('close', (code) => resolve({ code, stderr }));
    });
    child.stdin.write(`\\set VERBOSITY verbose
      set application_name = '${name}';
      set statement_timeout = '10s';
      begin;
      set local role authenticated;
      select set_config('request.jwt.claim.sub', '${user}', true);
      select set_config('request.jwt.claim.role', 'authenticated', true);
      insert into public.prayer_requests(user_id, body, audience, location_city, location_country)
      values ('${user}', 'Concurrent quota test', 'public', 'Unknown', 'Unknown');
    `);
    return { child, done };
  };
  const waitFor = async (condition, child) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (
        sql(`select exists (select 1 from pg_stat_activity where ${condition});`).trim() === 't'
      ) {
        return;
      }
      assert.equal(child.exitCode, null, 'Quota session exited before lock barrier');
      await setTimeout(20);
    }
    throw new Error(`Timed out waiting for quota barrier: ${condition}`);
  };

  for (const rollback of [false, true]) {
    sql(`delete from auth.users where id = '${user}';
      insert into auth.users(id, email, raw_user_meta_data)
      values ('${user}', 'quota-race@example.com', '{"username":"quota_race"}');
      insert into public.rate_limits(user_id, action)
      select '${user}', 'create_prayer' from generate_series(1,9);`);
    const holder = session('quota-holder');
    let contender;
    try {
      await waitFor(
        "application_name = 'quota-holder' and state = 'idle in transaction'",
        holder.child
      );
      contender = session('quota-contender');
      contender.child.stdin.end('commit;\n');
      await waitFor(
        "application_name = 'quota-contender' and wait_event_type = 'Lock'",
        contender.child
      );
      holder.child.stdin.end(rollback ? 'rollback;\n' : 'commit;\n');
      const first = await holder.done;
      const second = await contender.done;
      assert.equal(first.code, 0, first.stderr);
      if (rollback) {
        assert.equal(second.code, 0, second.stderr);
      } else {
        assert.notEqual(second.code, 0, 'Concurrent eleventh prayer must be denied');
        assert.match(second.stderr, /42501/);
      }
      assert.equal(
        sql(`select count(*) from public.rate_limits where user_id = '${user}';`).trim(),
        '10'
      );
      assert.equal(
        sql(`select count(*) from public.prayer_requests where user_id = '${user}';`).trim(),
        '1'
      );
      console.log(
        `Rate-limit concurrency passed: ${rollback ? 'rollback releases quota' : 'last slot cannot be double-spent'}.`
      );
    } finally {
      if (holder.child.exitCode === null) holder.child.kill();
      if (contender && contender.child.exitCode === null) contender.child.kill();
      await holder.done;
      if (contender) await contender.done;
    }
  }
  sql(`delete from auth.users where id = '${user}';`);
}
