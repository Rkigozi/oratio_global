import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, Check, Loader, Mail } from "lucide-react";
import { useAuth } from '../../hooks/auth-context';

export function Onboarding() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, needsEmailVerification } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleBegin = async () => {
    setError("");
    if (!email.trim() || !password.trim() || !username.trim()) {
      setError("All fields are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
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
      void navigate("/feed");
    }
  };

  if (verificationSent) {
    return (
      <div className="flex flex-col min-h-screen w-full text-text relative overflow-hidden" style={{ background: "rgb(var(--rgb-bg))" }}>
        <div className="relative z-10 flex flex-col flex-1 justify-center px-6 max-w-sm mx-auto w-full">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ background: "radial-gradient(circle, rgba(var(--rgb-accent), 0.2), rgba(var(--rgb-accent), 0.05))" }}
            >
              <Mail size={28} className="text-accent" />
            </div>
            <h2 className="font-heading font-light text-2xl mb-3">Check Your Email</h2>
            <p className="text-text-muted text-sm mb-2">
              We&apos;ve sent a confirmation link to <strong className="text-text-secondary">{email}</strong>
            </p>
            <p className="text-text-muted text-xs mb-8">
              Click the link to verify your account, then sign in.
            </p>
            <button
              onClick={() => void navigate("/login")}
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
    <div className="flex flex-col min-h-screen w-full text-text relative overflow-hidden" style={{ background: "rgb(var(--rgb-bg))" }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(var(--rgb-accent), 0.12), transparent 70%)" }}
      />

      <button
        onClick={() => void navigate("/landing")}
        className="absolute top-6 left-4 z-20 flex items-center gap-1.5 text-text-muted hover:text-text-muted transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} />
        <span className="text-xs">Back</span>
      </button>

      <div className="relative z-10 flex flex-col flex-1 justify-center px-6 max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-8"
        >
          <p className="text-accent text-xs tracking-[0.25em] uppercase mb-4">Welcome to</p>
          <h1 className="font-heading font-light tracking-[0.2em] text-text-secondary mb-3" style={{ fontSize: "2.2rem" }}>
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
            <p className="text-text-muted text-xs uppercase tracking-[0.15em] mb-2 text-center">Email</p>
            <input type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              className="w-full rounded-xl px-4 py-3.5 text-text placeholder-text-dim text-sm focus:outline-none border border-accent/12 transition-colors text-center"
              style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
            />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-[0.15em] mb-2 text-center">Password</p>
            <input type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-xl px-4 py-3.5 text-text placeholder-text-dim text-sm focus:outline-none border border-accent/12 transition-colors text-center"
              style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
            />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-[0.15em] mb-2 text-center">Username</p>
            <input type="text" value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., prayer_warrior"
              onKeyDown={(e) => e.key === "Enter" && void handleBegin()}
              className="w-full rounded-xl px-4 py-3.5 text-text placeholder-text-dim text-sm focus:outline-none border border-accent/12 transition-colors text-center"
              style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
            />
          </div>
          {error && <p className="text-danger text-xs text-center">{error}</p>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          <button onClick={() => void handleBegin()} disabled={loading}
            className="w-full py-4 rounded-full text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))",
              color: "rgb(var(--rgb-text))",
              boxShadow: "0 4px 28px rgba(var(--rgb-accent), 0.3)",
            }}
          >
            {loading ? <Loader size={15} className="animate-spin" /> : <Check size={15} />}
            {loading ? "Creating account..." : "Create Account"}
          </button>
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-accent/10" />
            <span className="text-text-dim text-[10px]">or</span>
            <div className="flex-1 h-px bg-accent/10" />
          </div>
          <button onClick={() => void signInWithGoogle()}
            className="w-full py-3.5 rounded-full text-sm flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-95 border border-accent/15 hover:border-accent/30"
            style={{ background: "rgba(var(--rgb-surface), 0.6)", color: "rgb(var(--rgb-text))" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18a11.96 11.96 0 0 0 0 10.95l3.66-2.93z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11.96 11.96 0 0 0 12 0a11.96 11.96 0 0 0-9.82 5.47l3.66 2.93A7.17 7.17 0 0 1 12 5.38z"/></svg>
            Continue with Google
          </button>
        </motion.div>
      </div>
    </div>
  );
}
