// Lint helper for the pre-commit hook. Runs ESLint against apps/web files
// with apps/web as the working directory so parserOptions.project resolves
// to apps/web/tsconfig.json (lint-staged always runs from the repo root).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const files = process.argv.slice(2);
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/web');

const result = spawnSync('npx', ['eslint', '--fix', ...files], {
  cwd: webDir,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
