// @vitest-environment node
import { expect, it } from 'vitest';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';

it('bundles the workspace schema when server packages remain external', async () => {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      lib: {
        entry: fileURLToPath(new URL('../netlify/functions/service-notice.ts', import.meta.url)),
        formats: ['es'],
      },
      rollupOptions: {
        external: (id) => !id.startsWith('.') && !id.startsWith('/'),
      },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((bundle) =>
    'output' in bundle ? bundle.output : []
  );
  const chunks = outputs.filter((output) => output.type === 'chunk');
  expect(chunks).toHaveLength(1);
  expect(chunks[0].exports).toContain('default');
  expect(chunks[0].imports.some((id) => id.startsWith('@oratio/'))).toBe(false);
  expect(chunks[0].code).toContain('Expiry must be after the display start.');
});
