import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { Check, Loader, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/auth-context';
import { AuthBackButton } from '../../components/auth/auth-back-button';
import { PasswordInput } from '../../components/auth/password-input';

function getSafeNextPath(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/feed';
}

export function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, needsEmailVerification } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const nextPath = getSafeNextPath(searchParams.get('next'));

  const handleBegin = async () => {
    setError('');
    if (!email.trim() || !password.trim() || !username.trim()) {
      setError('All fields are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const err = await signUp(email.trim(), password, username.trim().toLowerCase());
    setLoading(false);
    if (err) {
      setError(err);
    } else if (needsEmailVerification) {
      setVerificationSent(true);
    } else {
      void navigate(nextPath);
    }
  };

  if (verificationSent) {
    return (
      <div
        className="auth-page-scroll flex w-full flex-col text-text relative"
        style={{ background: 'rgb(var(--rgb-bg))' }}
      >
        <div className="relative z-10 flex flex-col flex-1 justify-center px-6 max-w-sm mx-auto w-full">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{
                background:
                  'radial-gradient(circle, rgba(var(--rgb-accent), 0.2), rgba(var(--rgb-accent), 0.05))',
              }}
            >
              <Mail size={28} className="text-accent" />
            </div>
            <h2 className="font-heading font-light text-2xl mb-3">Check Your Email</h2>
            <p className="text-text-muted text-sm mb-2">
              We&apos;ve sent a confirmation link to{' '}
              <strong className="text-text-secondary">{email}</strong>
            </p>
            <p className="text-text-muted text-xs mb-8">
              Click the link to verify your account, then sign in.
            </p>
            <button
              onClick={() => void navigate('/login')}
              className="px-8 py-3 rounded-full text-sm text-accent border border-accent/25 hover:border-accent/50 transition-all cursor-pointer"
            >
              Go to Sign In
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="auth-page-scroll flex w-full flex-col text-text relative"
      style={{ background: 'rgb(var(--rgb-bg))' }}
    >
      <AuthBackButton onClick={() => void navigate('/landing')} />

      <div className="relative z-10 flex flex-col flex-1 justify-center px-6 max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-8"
        >
          <p className="oratio-section-label mb-4">Welcome to</p>
          <h1
            className="font-heading font-light tracking-[0.2em] text-text-secondary mb-3"
            style={{ fontSize: '2.2rem' }}
          >
            ORATIO
          </h1>
          <p className="text-text-muted text-sm">Create your account to begin.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28 }}
          className="mb-6 space-y-4"
        >
          <div>
            <p className="oratio-section-label mb-2 text-center">
              Email
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              className="w-full rounded-xl px-4 py-3.5 text-text placeholder-text-dim text-sm focus:outline-none border border-text-faint/22 transition-colors text-center"
              style={{ background: 'rgba(var(--rgb-surface), 0.6)' }}
            />
          </div>
          <div>
            <p className="oratio-section-label mb-2 text-center">
              Password
            </p>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              hasError={error.toLowerCase().includes('password')}
            />
          </div>
          <div>
            <p className="oratio-section-label mb-2 text-center">
              Username
            </p>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., prayer_warrior"
              onKeyDown={(e) => e.key === 'Enter' && void handleBegin()}
              className="w-full rounded-xl px-4 py-3.5 text-text placeholder-text-dim text-sm focus:outline-none border border-text-faint/22 transition-colors text-center"
              style={{ background: 'rgba(var(--rgb-surface), 0.6)' }}
            />
          </div>
          {error && <p className="text-danger text-xs text-center">{error}</p>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          <button
            onClick={() => void handleBegin()}
            disabled={loading}
            className="oratio-primary-pill w-full py-4 rounded-full text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-100"
          >
            {loading ? <Loader size={15} className="animate-spin" /> : <Check size={15} />}
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p className="text-text-dim text-[10px] text-center mt-3">Secure sign-in for Oratio.</p>
        </motion.div>
      </div>
    </div>
  );
}
