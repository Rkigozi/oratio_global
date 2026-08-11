import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('production security headers', () => {
  it('allows the Supabase Realtime secure WebSocket', () => {
    const netlifyConfig = fs.readFileSync(path.join(process.cwd(), 'netlify.toml'), 'utf8');

    expect(netlifyConfig).toContain('wss://tfwgoavbbudkxthjhnrx.supabase.co');
  });
});
