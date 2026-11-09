const errors = [];
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

try {
  const parsed = new URL(url);
  if (
    url !== url.trim() ||
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== '/' ||
    parsed.hostname === 'your-project.supabase.co'
  ) {
    throw new Error('Invalid project URL');
  }
} catch {
  errors.push(
    'EXPO_PUBLIC_SUPABASE_URL must be the HTTPS project URL, without credentials or paths.'
  );
}

let publicKey = typeof key === 'string' && /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
if (!publicKey && typeof key === 'string') {
  // This detects accidental server-key use; it does not verify a JWT signature.
  const parts = key.split('.');
  if (parts.length === 3 && parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) {
    try {
      publicKey = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role === 'anon';
    } catch {
      publicKey = false;
    }
  }
}
if (!publicKey) {
  errors.push(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY must be a publishable or legacy anon key, never a secret or service-role key.'
  );
}

const noticeUrl = process.env.EXPO_PUBLIC_SERVICE_NOTICE_URL;
if (noticeUrl) {
  try {
    const parsed = new URL(noticeUrl);
    if (
      noticeUrl !== noticeUrl.trim() ||
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== '/.netlify/functions/service-notice'
    ) {
      throw new Error('Invalid notice URL');
    }
  } catch {
    errors.push(
      'EXPO_PUBLIC_SERVICE_NOTICE_URL must be the HTTPS public notice endpoint, without credentials, query or fragment.'
    );
  }
}

const monitoringEnabled = process.env.EXPO_PUBLIC_SENTRY_ENABLED;
if (monitoringEnabled && !['true', 'false'].includes(monitoringEnabled)) {
  errors.push('EXPO_PUBLIC_SENTRY_ENABLED must be true or false.');
}
if (monitoringEnabled === 'true') {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  try {
    const parsed = new URL(dsn);
    if (
      dsn !== dsn.trim() ||
      parsed.protocol !== 'https:' ||
      !/^[a-f0-9]{32}$/.test(parsed.username) ||
      !/^o[0-9]+\.ingest(?:\.[a-z]+)?\.sentry\.io$/.test(parsed.hostname) ||
      !/^\/[0-9]+$/.test(parsed.pathname) ||
      parsed.password ||
      parsed.port ||
      parsed.search ||
      parsed.hash
    )
      throw new Error('Invalid DSN');
  } catch {
    errors.push(
      'EXPO_PUBLIC_SENTRY_DSN must be a public HTTPS DSN for the approved Sentry project.'
    );
  }
  if (!['staging', 'production'].includes(process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT)) {
    errors.push('EXPO_PUBLIC_SENTRY_ENVIRONMENT must be staging or production for native builds.');
  }
  const sha = process.env.EAS_BUILD_GIT_COMMIT_HASH || process.env.EXPO_PUBLIC_GIT_SHA;
  if (!/^[a-f0-9]{40}$/.test(sha || '')) {
    errors.push(
      'Monitoring requires EAS_BUILD_GIT_COMMIT_HASH or EXPO_PUBLIC_GIT_SHA (full Git SHA).'
    );
  }
}

if (errors.length) {
  for (const error of errors) console.error(`[mobile build] ${error}`);
  process.exitCode = 1;
} else {
  console.log('Mobile build environment validated. No credential values logged.');
}
