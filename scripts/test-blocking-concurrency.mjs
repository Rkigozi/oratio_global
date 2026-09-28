import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

// Called only with the disposable cluster's Unix socket, never a live database.
export async function testBlockingConcurrency({ sql, psqlArgs }) {
  const a = '10000000-0000-0000-0000-000000000001';
  const b = '10000000-0000-0000-0000-000000000002';
  const invite = '10000000-0000-0000-0000-000000000050';
  const block = (target) => `select public.block_user('${target}');`;
  const accept = `select public.respond_to_prayer_circle_invite('${invite}', 'accepted');`;
  const sendInvite = `insert into public.prayer_circle_invites(id, requester_id, recipient_id)
    values ('${invite}', '${a}', '${b}');`;
  const follow = `insert into public.follows(follower_id, following_id) values ('${a}', '${b}');`;

  const session = (name, userId, statement, hold = false) => {
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
      select set_config('request.jwt.claim.sub', '${userId}', true);
      select set_config('request.jwt.claim.role', 'authenticated', true);
      ${statement}
    `);
    if (!hold) child.stdin.end('commit;\n');
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
      assert.equal(child.exitCode, null, 'Session exited before reaching the lock barrier');
      await setTimeout(20);
    }
    throw new Error(`Timed out waiting for database barrier: ${condition}`);
  };

  const race = async ({
    name,
    firstUser,
    first,
    secondUser,
    second,
    pending,
    error,
    blockCount = 1,
  }) => {
    sql(`delete from auth.users where id in ('${a}', '${b}');
      insert into auth.users(id, email, raw_user_meta_data) values
        ('${a}', 'concurrent-a@example.com', '{"username":"concurrent_a"}'),
        ('${b}', 'concurrent-b@example.com', '{"username":"concurrent_b"}');
      ${pending ? sendInvite : ''}`);
    const holder = session('blocking-holder', firstUser, first, true);
    let contender;
    try {
      await waitFor(
        "application_name = 'blocking-holder' and state = 'idle in transaction'",
        holder.child
      );
      contender = session('blocking-contender', secondUser, second);
      // Observe a real lock wait before committing, rather than relying on sleep timing.
      await waitFor(
        "application_name = 'blocking-contender' and wait_event_type = 'Lock'",
        contender.child
      );
      holder.child.stdin.end('commit;\n');
      const firstResult = await holder.done;
      const secondResult = await contender.done;
      assert.equal(firstResult.code, 0, `${name}: ${firstResult.stderr}`);
      if (error) {
        assert.notEqual(secondResult.code, 0, `${name}: expected ${error}, but write succeeded`);
        assert.match(secondResult.stderr, new RegExp(error), name);
      } else {
        assert.equal(secondResult.code, 0, `${name}: ${secondResult.stderr}`);
      }
      assert.equal(
        sql('select count(*) from public.user_blocks;').trim(),
        String(blockCount),
        name
      );
      assert.equal(sql('select count(*) from public.prayer_circle_connections;').trim(), '0', name);
      assert.equal(
        sql("select count(*) from public.prayer_circle_invites where status = 'pending';").trim(),
        '0',
        name
      );
      assert.equal(sql('select count(*) from public.follows;').trim(), '0', name);
      console.log(`Blocking concurrency passed: ${name}.`);
    } finally {
      if (holder.child.exitCode === null) holder.child.kill();
      if (contender && contender.child.exitCode === null) contender.child.kill();
      await holder.done;
      if (contender) await contender.done;
    }
  };

  await race({
    name: 'block before accept',
    firstUser: a,
    first: block(b),
    secondUser: b,
    second: accept,
    pending: true,
    error: '40001',
  });
  await race({
    name: 'accept before block',
    firstUser: b,
    first: accept,
    secondUser: a,
    second: block(b),
    pending: true,
  });
  await race({
    name: 'block before invite',
    firstUser: b,
    first: block(a),
    secondUser: a,
    second: sendInvite,
    error: '42501',
  });
  await race({
    name: 'invite before block',
    firstUser: a,
    first: sendInvite,
    secondUser: b,
    second: block(a),
  });
  await race({
    name: 'reciprocal blocks',
    firstUser: a,
    first: block(b),
    secondUser: b,
    second: block(a),
    blockCount: 2,
  });
  await race({
    name: 'block before legacy follow',
    firstUser: b,
    first: block(a),
    secondUser: a,
    second: follow,
    error: '42501',
  });
  await race({
    name: 'legacy follow before block',
    firstUser: a,
    first: follow,
    secondUser: b,
    second: block(a),
  });
  sql(`delete from auth.users where id in ('${a}', '${b}');`);
}
