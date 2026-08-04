import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { LogIn, Loader } from 'lucide-react';
import { useAuth } from '../../hooks/auth-context';
import { AuthBackButton } from '../../components/auth/auth-back-button';
import { PasswordInput } from '../../components/auth/password-input';

function getSafeNextPath(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/feed';
}

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nextPath = getSafeNextPath(searchParams.get('next'));
  const isSharedPrayerLogin = nextPath.startsWith('/prayer/');

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password');
      return;
    }
    setLoading(true);
    const err = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      void navigate(nextPath);
    }
  };

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
          className="text-center mb-10"
        >
          <p className="oratio-section-label mb-4">Welcome back</p>
          <h1
            className="font-heading font-light tracking-[0.2em] text-text-secondary mb-3"
            style={{ fontSize: '2.2rem' }}
          >
            ORATIO
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28 }}
          className="mb-6 space-y-4"
        >
          <p className="text-text-muted text-sm text-center mb-4">
            {isSharedPrayerLogin
              ? 'Sign in to open this shared prayer.'
              : 'Sign back in to your account.'}
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="Email"
            autoFocus
            className="w-full rounded-xl px-4 py-3.5 text-text placeholder-text-dim text-sm focus:outline-none border transition-colors text-center"
            style={{
              background: 'rgba(var(--rgb-surface), 0.6)',
              borderColor: error ? 'rgb(var(--rgb-danger))' : 'rgba(var(--rgb-text-faint), 0.22)',
            }}
          />
          <PasswordInput
            value={password}
            onChange={(nextPassword) => {
              setPassword(nextPassword);
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && void handleLogin()}
            placeholder="Password"
            autoComplete="current-password"
            hasError={Boolean(error)}
          />
          {error && <p className="text-danger text-xs text-center">{error}</p>}
          <button
            onClick={() => void navigate('/reset-password')}
            className="w-full text-center text-text-dim hover:text-accent text-xs transition-colors cursor-pointer pt-1"
          >
            Forgot password?
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          <button
            onClick={() => void handleLogin()}
            disabled={loading}
            className="oratio-primary-pill w-full py-4 rounded-full text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-100"
          >
            {loading ? <Loader size={15} className="animate-spin" /> : <LogIn size={15} />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-text-faint/20" />
            <span className="text-text-dim text-[10px]">or</span>
            <div className="flex-1 h-px bg-text-faint/20" />
          </div>
          <button
            onClick={() => void signInWithGoogle(nextPath)}
            className="w-full py-3.5 rounded-full text-sm flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-95 border border-text-faint/22 hover:border-text-faint/40"
            style={{ background: 'rgba(var(--rgb-surface), 0.6)', color: 'rgb(var(--rgb-text))' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18a11.96 11.96 0 0 0 0 10.95l3.66-2.93z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11.96 11.96 0 0 0 12 0a11.96 11.96 0 0 0-9.82 5.47l3.66 2.93A7.17 7.17 0 0 1 12 5.38z"
              />
            </svg>
            Continue with Google
          </button>
          <p className="text-text-dim text-[10px] text-center mt-3">Secure sign-in for Oratio.</p>
        </motion.div>
      </div>
    </div>
  );
}
