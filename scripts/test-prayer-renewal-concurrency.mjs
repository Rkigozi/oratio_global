import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

// Runs against the disposable cluster's Unix socket, never the linked project.
export async function testPrayerRenewalConcurrency({ sql, psqlArgs }) {
  const user = '60000000-0000-0000-0000-000000000001';
  const prayer = '60000000-0000-0000-0000-000000000002';
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
      set application_name = '${name}'; set statement_timeout = '10s'; begin;
      set local role authenticated;
      select set_config('request.jwt.claim.sub', '${user}', true);
      select set_config('request.jwt.claim.role', 'authenticated', true);
      select public.renew_public_prayer('${prayer}');
    `);
    return { child, done };
  };
  const waitFor = async (condition, child) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (sql(`select exists (select 1 from pg_stat_activity where ${condition});`).trim() === 't')
        return;
      assert.equal(child.exitCode, null, 'Renewal session exited before the lock barrier');
      await setTimeout(20);
    }
    throw new Error(`Timed out waiting for renewal barrier: ${condition}`);
  };
  for (const rollback of [false, true]) {
    sql(`delete from auth.users where id = '${user}';
      insert into auth.users(id, email, raw_user_meta_data)
      values ('${user}', 'renewal-race@example.com', '{"username":"renewal_race"}');
      insert into public.prayer_requests(id, user_id, body, audience, location_city, location_country)
      values ('${prayer}', '${user}', 'Concurrent renewal prayer', 'public', 'Unknown', 'Unknown');
      update public.prayer_requests set public_expires_at = now() - interval '1 second' where id = '${prayer}';`);
    const holder = session('renewal-holder');
    let contender;
    try {
      await waitFor(
        "application_name = 'renewal-holder' and state = 'idle in transaction'",
        holder.child
      );
      contender = session('renewal-contender');
      contender.child.stdin.end('commit;\n');
      await waitFor(
        "application_name = 'renewal-contender' and wait_event_type = 'Lock'",
        contender.child
      );
      holder.child.stdin.end(rollback ? 'rollback;\n' : 'commit;\n');
      const first = await holder.done;
      const second = await contender.done;
      assert.equal(first.code, 0, first.stderr);
      if (rollback) assert.equal(second.code, 0, second.stderr);
      else {
        assert.notEqual(
          second.code,
          0,
          'Concurrent renewal must not extend an active prayer again'
        );
        assert.match(second.stderr, /22023/);
      }
      assert.equal(
        sql(`select count(*) from public.prayer_requests where id = '${prayer}'
        and public_expires_at > now() + interval '13 days';`).trim(),
        '1'
      );
      console.log(
        `Prayer renewal concurrency passed: ${rollback ? 'rollback allows retry' : 'double renewal is rejected'}.`
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
