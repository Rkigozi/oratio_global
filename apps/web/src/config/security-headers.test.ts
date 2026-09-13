import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('production security headers', () => {
  const netlifyConfigPath = path.resolve(process.cwd(), '..', '..', 'netlify.toml');

  it('allows the Supabase Realtime secure WebSocket', () => {
    const netlifyConfig = fs.readFileSync(netlifyConfigPath, 'utf8');

    expect(netlifyConfig).toContain('wss://tfwgoavbbudkxthjhnrx.supabase.co');
  });

  it('publishes the workspace build from the repository-root Netlify site', () => {
    const netlifyConfig = fs.readFileSync(netlifyConfigPath, 'utf8');

    expect(netlifyConfig).toContain('publish = "apps/web/dist"');
    expect(netlifyConfig).toContain('from = "/*"');
    expect(netlifyConfig).toContain('to = "/index.html"');
  });

  it('ships the SPA fallback needed for direct prayer links', () => {
    const redirects = fs.readFileSync(path.join(process.cwd(), 'public', '_redirects'), 'utf8');

    expect(redirects.trim()).toBe('/* /index.html 200');
  });
});
