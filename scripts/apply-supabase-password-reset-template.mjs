import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRef = process.env.SUPABASE_PROJECT_REF || 'tfwgoavbbudkxthjhnrx';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const templatePath = resolve('docs/email-templates/password-reset-supabase-body.html');

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN.');
  console.error('Create one in Supabase Dashboard > Account > Access Tokens, then run:');
  console.error('SUPABASE_ACCESS_TOKEN=... npm run supabase:email:password-reset');
  process.exit(1);
}

const html = await readFile(templatePath, 'utf8');

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    mailer_subjects_recovery: 'Reset your Oratio password',
    mailer_templates_recovery_content: html,
  }),
});

const body = await response.text();

if (!response.ok) {
  console.error(`Supabase template update failed with HTTP ${response.status}.`);
  console.error(body);
  process.exit(1);
}

console.log('Updated Supabase password reset email template.');
