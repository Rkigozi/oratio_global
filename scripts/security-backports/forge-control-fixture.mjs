import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FORGE_BASE_HASH,
  FORGE_PATCHED_HASH,
  FORGE_UPSTREAM_HASH,
  sha256,
} from './forge-backport.mjs';

// Reconstruct only the historical RSA control. Supporting files remain from the
// installed library; these fixtures do not claim a complete 1.4.0 distribution.
export function historicalForgeRsa(current) {
  const hash = sha256(current);
  if (hash === FORGE_BASE_HASH) return current;
  const upstream = hash === FORGE_UPSTREAM_HASH;
  assert(upstream || hash === FORGE_PATCHED_HASH, 'Unexpected Forge control source');
  const patch = fileURLToPath(
    new URL(upstream ? './forge-140-to-142-rsa.patch' : './forge-1159-rsa.patch', import.meta.url)
  );
  assert.equal(
    sha256(readFileSync(patch)),
    upstream
      ? 'ca88156f6407c4c8ab9eb514cc4cc42f09711f864738b5d6dfeda257a5db9dd5'
      : 'be8e74c1d011bab844d9e2705f7a5f6428f444b28fa174cdad1572a45ef8f618'
  );
  const dir = mkdtempSync(join(tmpdir(), 'oratio-forge-control-'));
  try {
    mkdirSync(join(dir, 'lib'));
    writeFileSync(join(dir, 'lib/rsa.js'), current);
    execFileSync('git', ['init', '--quiet', dir]);
    execFileSync(
      'git',
      ['-c', 'core.autocrlf=false', 'apply', '--reverse', '--unidiff-zero', patch],
      { cwd: dir }
    );
    const bytes = readFileSync(join(dir, 'lib/rsa.js'));
    assert.equal(sha256(bytes), FORGE_BASE_HASH);
    return bytes;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
