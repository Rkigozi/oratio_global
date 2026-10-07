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

if (errors.length) {
  for (const error of errors) console.error(`[mobile build] ${error}`);
  process.exitCode = 1;
} else {
  console.log('Mobile build environment validated. No credential values logged.');
}
