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
  const { signIn } = useAuth();
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
          <p className="text-text-dim text-[10px] text-center mt-3">Secure sign-in for Oratio.</p>
        </motion.div>
      </div>
    </div>
  );
}
