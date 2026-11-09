import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  FORGE_BASE_HASH,
  FORGE_PATCHED_HASH,
  FORGE_UPSTREAM_HASH,
  installForgeBackport,
  sha256,
  verifyForgeBackport,
} from './forge-backport.mjs';
import { historicalForgeRsa } from './forge-control-fixture.mjs';

const require = createRequire(import.meta.url);
const current = readFileSync(require.resolve('node-forge/lib/rsa.js'));
const base = historicalForgeRsa(current);

function fixture(t, copies = [{ path: 'node_modules/node-forge', version: '1.4.0', bytes: base }]) {
  const root = mkdtempSync(join(tmpdir(), 'oratio-forge-fixture-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const packages = {};
  for (const copy of copies) {
    const folder = join(root, copy.path);
    mkdirSync(join(folder, 'lib'), { recursive: true });
    writeFileSync(
      join(folder, 'package.json'),
      JSON.stringify({ name: 'node-forge', version: copy.version, main: 'lib/index.js' })
    );
    writeFileSync(join(folder, 'lib/rsa.js'), copy.bytes);
    packages[copy.path] = { version: copy.version };
  }
  writeFileSync(join(root, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages }));
  return root;
}

test('clean install applies the exact backport and repeated installs are idempotent', (t) => {
  const root = fixture(t);
  assert.throws(() => verifyForgeBackport(root), /backport is missing/);
  assert.deepEqual(installForgeBackport(root), { installed: 1, verified: 1 });
  assert.equal(
    sha256(readFileSync(join(root, 'node_modules/node-forge/lib/rsa.js'))),
    FORGE_PATCHED_HASH
  );
  assert.deepEqual(installForgeBackport(root), { installed: 0, verified: 1 });
  assert.deepEqual(verifyForgeBackport(root), ['node_modules/node-forge']);
});

test('all lockfile-listed nested copies are patched and verified', (t) => {
  const root = fixture(
    t,
    ['node_modules/node-forge', 'node_modules/example/node_modules/node-forge'].map((path) => ({
      path,
      version: '1.4.0',
      bytes: base,
    }))
  );
  assert.deepEqual(installForgeBackport(root), { installed: 2, verified: 2 });
  assert.equal(verifyForgeBackport(root).length, 2);
});

test('unknown source is preserved and preflight prevents partial patching', (t) => {
  const changed = Buffer.concat([base, Buffer.from('\n// local change\n')]);
  const root = fixture(t, [
    { path: 'node_modules/node-forge', version: '1.4.0', bytes: base },
    { path: 'node_modules/example/node_modules/node-forge', version: '1.4.0', bytes: changed },
  ]);
  assert.throws(() => installForgeBackport(root), /Unexpected Forge RSA source/);
  assert.equal(
    sha256(readFileSync(join(root, 'node_modules/node-forge/lib/rsa.js'))),
    FORGE_BASE_HASH
  );
  assert.deepEqual(
    readFileSync(join(root, 'node_modules/example/node_modules/node-forge/lib/rsa.js')),
    changed
  );
});

test('an upstream version change requires review instead of force-patching', (t) => {
  const root = fixture(t, [{ path: 'node_modules/node-forge', version: '1.4.1', bytes: base }]);
  assert.throws(() => installForgeBackport(root), /Review the backport before upgrading/);
});

test('reviewed upstream 1.4.2 is verified without changing published source', (t) => {
  assert.equal(sha256(current), FORGE_UPSTREAM_HASH);
  const root = fixture(t, [{ path: 'node_modules/node-forge', version: '1.4.2', bytes: current }]);
  assert.deepEqual(installForgeBackport(root), { installed: 0, verified: 1 });
  assert.deepEqual(verifyForgeBackport(root), ['node_modules/node-forge']);
  assert.deepEqual(readFileSync(join(root, 'node_modules/node-forge/lib/rsa.js')), current);
});

test('changed upstream source is preserved and cannot pass verification', (t) => {
  const changed = Buffer.concat([current, Buffer.from('\n// local change\n')]);
  const root = fixture(t, [{ path: 'node_modules/node-forge', version: '1.4.2', bytes: changed }]);
  assert.throws(() => installForgeBackport(root), /Unexpected Forge RSA source/);
  assert.throws(() => verifyForgeBackport(root), /Unexpected Forge RSA source/);
  assert.deepEqual(readFileSync(join(root, 'node_modules/node-forge/lib/rsa.js')), changed);
});

test('a pre-existing staging file is never removed or overwritten', (t) => {
  const root = fixture(t);
  const file = join(root, 'node_modules/node-forge/lib/rsa.js.oratio-backport');
  writeFileSync(file, 'preserve this file');
  assert.throws(() => installForgeBackport(root), /EEXIST/);
  assert.equal(readFileSync(file, 'utf8'), 'preserve this file');
  assert.equal(
    sha256(readFileSync(join(root, 'node_modules/node-forge/lib/rsa.js'))),
    FORGE_BASE_HASH
  );
});

test('a partial web-only install skips absent tooling but verification requires it', (t) => {
  const root = fixture(t, []);
  assert.deepEqual(installForgeBackport(root), { installed: 0, verified: 0 });
  assert.throws(() => verifyForgeBackport(root), /installation is missing/);
});

test('tampered installed backport cannot pass verification', (t) => {
  const root = fixture(t);
  installForgeBackport(root);
  const file = join(root, 'node_modules/node-forge/lib/rsa.js');
  writeFileSync(file, 'tampered');
  assert.throws(() => verifyForgeBackport(root), /Unexpected Forge RSA source/);
});
