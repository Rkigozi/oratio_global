import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT } from './forge-backport.mjs';

const cliRoot = join(ROOT, 'node_modules/@expo/cli');
const requireCli = createRequire(join(cliRoot, 'package.json'));
const pkg = JSON.parse(readFileSync(join(cliRoot, 'package.json'), 'utf8'));
const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'));
const schemaFile = join(cliRoot, 'build/src/start/server/devtools/DevToolsPlugin.schema.js');
const { PluginSchema } = requireCli(schemaFile);
const { validate, ValidationError } = requireCli('@expo/schema-utils');

test('the installed compatible CLI has no production Zod or optional MCP installation', () => {
  assert.equal(pkg.version, '58.1.19');
  assert.equal(lock.packages['node_modules/@expo/cli'].version, pkg.version);
  assert.equal(Object.hasOwn(pkg.dependencies, 'zod'), false);
  assert.equal(Object.hasOwn(lock.packages, 'node_modules/@expo/cli/node_modules/zod'), false);
  assert.equal(Object.hasOwn(lock.packages, 'node_modules/expo-mcp'), false);
  assert.throws(() => requireCli.resolve('expo-mcp'), { code: 'MODULE_NOT_FOUND' });
  assert.doesNotMatch(readFileSync(schemaFile, 'utf8'), /require\(['"]zod(?:\/[^'"]*)?['"]\)/);
});

test('the replacement DevTools schema accepts valid metadata without loading a plugin', () => {
  const plugin = {
    packageName: 'qa-plugin',
    packageRoot: '/synthetic-qa/plugin',
    cliExtensions: {
      description: 'Synthetic metadata',
      entryPoint: './not-executed.js',
      commands: [{ name: 'check', title: 'Check', environments: ['cli'] }],
    },
  };
  assert.doesNotThrow(() => validate(PluginSchema, plugin));
});

test('the replacement DevTools schema rejects malformed metadata', () => {
  for (const plugin of [
    { packageName: '', packageRoot: '/synthetic-qa/plugin' },
    { packageName: 'qa-plugin' },
    {
      packageName: 'qa-plugin',
      packageRoot: '/synthetic-qa/plugin',
      cliExtensions: { description: 'QA', entryPoint: './not-executed.js', commands: [] },
    },
    {
      packageName: 'qa-plugin',
      packageRoot: '/synthetic-qa/plugin',
      cliExtensions: {
        description: 'QA',
        entryPoint: './not-executed.js',
        commands: [{ name: 'check', title: 'Check', environments: ['unsupported'] }],
      },
    },
  ]) {
    assert.throws(() => validate(PluginSchema, plugin), ValidationError);
  }
});
