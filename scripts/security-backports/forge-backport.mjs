import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const FORGE_BASE_HASH = 'fd4740238145ec26470eb3f06a627c72039538ce1307dbdce40521f94dfd0a50';
export const FORGE_PATCHED_HASH =
  'c7b72e7ef41f4fc0e5228dce3e37851e9ca064c789365d5e392c25d1c5f6e710';
export const FORGE_PATCH_HASH = 'be8e74c1d011bab844d9e2705f7a5f6428f444b28fa174cdad1572a45ef8f618';
export const FORGE_UPSTREAM_HASH =
  '6632e195295ce76f6bb9131ee770dcd6cc1ee4ffac7906302208b00faf95a87f';
export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const patchFile = fileURLToPath(new URL('./forge-1159-rsa.patch', import.meta.url));
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function installedCopies(root, required) {
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  assert(lock.packages && lock.lockfileVersion === 3, 'Expected the workspace lockfile');
  const copies = [];
  for (const [path, metadata] of Object.entries(lock.packages)) {
    if (!/(?:^|\/)node_modules\/node-forge$/.test(path)) continue;
    assert(!path.split('/').includes('..') && !path.startsWith('/'), 'Invalid Forge install path');
    const folder = join(root, path);
    if (!existsSync(folder)) continue;
    const file = join(folder, 'lib/rsa.js');
    assert(
      realpathSync(file).startsWith(realpathSync(root) + sep),
      'Forge source is outside the workspace'
    );
    const pkg = JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8'));
    assert(
      ['1.4.0', '1.4.2'].includes(metadata.version),
      'Review the backport before upgrading Forge'
    );
    assert.equal(pkg.name, 'node-forge');
    assert.equal(pkg.version, metadata.version);
    assert.equal(pkg.main, 'lib/index.js', 'Only the verified Node implementation is covered');
    const hash = sha256(readFileSync(file));
    assert(
      (pkg.version === '1.4.2'
        ? [FORGE_UPSTREAM_HASH]
        : [FORGE_BASE_HASH, FORGE_PATCHED_HASH]
      ).includes(hash),
      'Unexpected Forge RSA source; refusing to overwrite it'
    );
    copies.push({ path, file, hash, version: pkg.version });
  }
  if (required) assert(copies.length > 0, 'The verified Forge installation is missing');
  return copies;
}

function patchedBytes(base) {
  assert.equal(sha256(base), FORGE_BASE_HASH);
  assert.equal(sha256(readFileSync(patchFile)), FORGE_PATCH_HASH, 'Backport diff changed');
  const temp = mkdtempSync(join(tmpdir(), 'oratio-forge-install-'));
  // A private Git directory keeps patch application independent of the user's repo/config.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))
  );
  env.GIT_CONFIG_NOSYSTEM = '1';
  env.GIT_CONFIG_GLOBAL = process.platform === 'win32' ? 'NUL' : '/dev/null';
  try {
    mkdirSync(join(temp, 'lib'));
    writeFileSync(join(temp, 'lib/rsa.js'), base);
    execFileSync('git', ['init', '--quiet', temp], { env });
    execFileSync(
      'git',
      ['-c', 'core.autocrlf=false', 'apply', '--check', '--whitespace=error', patchFile],
      { cwd: temp, env }
    );
    execFileSync('git', ['-c', 'core.autocrlf=false', 'apply', '--whitespace=error', patchFile], {
      cwd: temp,
      env,
    });
    const result = readFileSync(join(temp, 'lib/rsa.js'));
    assert.equal(
      sha256(result),
      FORGE_PATCHED_HASH,
      'Backport output does not match the verified source'
    );
    return result;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

export function verifyForgeBackport(root = ROOT, { required = true } = {}) {
  assert.equal(sha256(readFileSync(patchFile)), FORGE_PATCH_HASH, 'Backport diff changed');
  const copies = installedCopies(root, required);
  for (const copy of copies)
    assert.equal(
      copy.hash,
      copy.version === '1.4.2' ? FORGE_UPSTREAM_HASH : FORGE_PATCHED_HASH,
      'Forge backport is missing; run npm run install:security-backport'
    );
  return copies.map(({ path }) => path);
}

export function installForgeBackport(root = ROOT) {
  assert.equal(sha256(readFileSync(patchFile)), FORGE_PATCH_HASH, 'Backport diff changed');
  const copies = installedCopies(root, false);
  const pending = copies.filter((copy) => copy.hash === FORGE_BASE_HASH);
  if (pending.length) {
    const bytes = patchedBytes(readFileSync(pending[0].file));
    // Preflight every copy before any write; preserve unknown/local source changes.
    for (const copy of pending) assert.equal(sha256(readFileSync(copy.file)), FORGE_BASE_HASH);
    for (const copy of pending) {
      const staging = `${copy.file}.oratio-backport`;
      let created = false;
      try {
        assert.equal(sha256(readFileSync(copy.file)), FORGE_BASE_HASH);
        writeFileSync(staging, bytes, { flag: 'wx', mode: statSync(copy.file).mode & 0o777 });
        created = true;
        assert.equal(sha256(readFileSync(copy.file)), FORGE_BASE_HASH);
        renameSync(staging, copy.file);
      } catch (error) {
        if (created && existsSync(staging)) rmSync(staging);
        throw error;
      }
    }
  }
  verifyForgeBackport(root, { required: copies.length > 0 });
  return { installed: pending.length, verified: copies.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { 'verify-only': { type: 'boolean' } } });
    const result = values['verify-only']
      ? { installed: 0, verified: verifyForgeBackport().length }
      : installForgeBackport();
    console.log(
      `Forge Node security: ${result.installed} backports applied, ${result.verified} sources verified.`
    );
  } catch (error) {
    console.error(`Forge backport verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}
