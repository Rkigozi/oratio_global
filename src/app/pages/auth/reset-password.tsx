import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, Mail, Loader, Check } from "lucide-react";
import { useAuth } from '../../hooks/auth-context';

export function ResetPassword() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    setError("");
    if (!email.trim()) {
      setError("Enter your email address");
      return;
    }
    setLoading(true);
    const err = await resetPassword(email.trim());
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSent(true);
    }
  };

  if (sent) {
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
              <Check size={28} className="text-accent" />
            </div>
            <h2 className="font-heading font-light text-2xl mb-3">Check Your Email</h2>
            <p className="text-text-muted text-sm mb-2">
              We've sent a password reset link to <strong className="text-text-secondary">{email}</strong>
            </p>
            <p className="text-text-muted text-xs mb-8">
              Click the link in the email to reset your password. It expires in 1 hour.
            </p>
            <button
              onClick={() => void navigate("/login")}
              className="px-8 py-3 rounded-full text-sm text-accent border border-accent/25 hover:border-accent/50 transition-all cursor-pointer"
            >
              Back to Sign In
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
        onClick={() => void navigate("/login")}
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
          className="text-center mb-10"
        >
          <p className="text-accent text-xs tracking-[0.25em] uppercase mb-4">Reset Password</p>
          <h1 className="font-heading font-light tracking-[0.2em] text-text-secondary mb-3" style={{ fontSize: "2rem" }}>
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
            Enter your email and we'll send you a reset link.
          </p>
          <input type="email" value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="your@email.com"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && void handleReset()}
            className="w-full rounded-xl px-4 py-3.5 text-text placeholder-text-dim text-sm focus:outline-none border transition-colors text-center"
            style={{
              background: "rgba(var(--rgb-surface), 0.6)",
              borderColor: error ? 'rgb(var(--rgb-danger))' : 'rgba(var(--rgb-accent), 0.12)',
            }}
          />
          {error && <p className="text-danger text-xs text-center">{error}</p>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          <button onClick={() => void handleReset()} disabled={loading}
            className="w-full py-4 rounded-full text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))",
              color: "rgb(var(--rgb-text))",
              boxShadow: "0 4px 28px rgba(var(--rgb-accent), 0.3)",
            }}
          >
            {loading ? <Loader size={15} className="animate-spin" /> : <Mail size={15} />}
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
