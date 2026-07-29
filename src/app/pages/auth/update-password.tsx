import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Check, Loader, Lock } from "lucide-react";
import { useAuth } from '../../hooks/auth-context';

export function UpdatePassword() {
  const navigate = useNavigate();
  const { updatePassword, user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionCheckExpired, setSessionCheckExpired] = useState(false);
  const waitingForSession = !user && !sessionCheckExpired;

  useEffect(() => {
    const timer = setTimeout(() => setSessionCheckExpired(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdate = async () => {
    setError("");
    if (!password.trim() || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    const err = await updatePassword(password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setDone(true);
    }
  };

  if (waitingForSession) {
    return (
      <div className="auth-page-scroll flex w-full flex-col items-center justify-center" style={{ background: "rgb(var(--rgb-bg))" }}>
        <Loader size={20} className="animate-spin text-accent mb-4" />
        <p className="text-text-muted text-sm">Verifying your reset link...</p>
      </div>
    );
  }

  if (!user && !waitingForSession) {
    return (
      <div className="auth-page-scroll flex w-full flex-col items-center justify-center px-6" style={{ background: "rgb(var(--rgb-bg))" }}>
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: "rgba(var(--rgb-danger), 0.1)" }}
          >
            <Lock size={22} className="text-danger" />
          </div>
          <h2 className="font-heading font-light text-xl mb-2 text-text">Invalid or Expired Link</h2>
          <p className="text-text-muted text-sm mb-6">
            This password reset link is invalid or has expired. Request a new one.
          </p>
          <button
            onClick={() => void navigate("/reset-password")}
            className="px-8 py-3 rounded-full text-sm text-accent border border-accent/25 hover:border-accent/50 transition-all cursor-pointer"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="auth-page-scroll flex w-full flex-col items-center justify-center px-6" style={{ background: "rgb(var(--rgb-bg))" }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ background: "radial-gradient(circle, rgba(var(--rgb-accent), 0.2), rgba(var(--rgb-accent), 0.05))" }}
          >
            <Check size={28} className="text-accent" />
          </div>
          <h2 className="font-heading font-light text-2xl mb-3 text-text">Password Updated</h2>
          <p className="text-text-muted text-sm mb-8">Your password has been changed successfully.</p>
          <button
            onClick={() => void navigate("/feed")}
            className="px-8 py-3 rounded-full text-sm text-white cursor-pointer"
            style={{ background: "linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))" }}
          >
            Go to Feed
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="auth-page-scroll flex w-full flex-col text-text relative" style={{ background: "rgb(var(--rgb-bg))" }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(var(--rgb-accent), 0.12), transparent 70%)" }}
      />
      <div className="relative z-10 flex flex-col flex-1 justify-center px-6 max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <p className="text-accent text-xs tracking-[0.25em] uppercase mb-4">Reset Password</p>
          <h1 className="font-heading font-light tracking-[0.2em] text-white mb-3" style={{ fontSize: "2rem" }}>
            Choose a New Password
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28 }}
          className="mb-6 space-y-4"
        >
          <input type="password" value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="New password (6+ characters)"
            autoFocus
            className="w-full rounded-xl px-4 py-3.5 text-text placeholder-text-dim text-sm focus:outline-none border transition-colors text-center"
            style={{
              background: "rgba(var(--rgb-surface), 0.6)",
              borderColor: error ? 'rgb(var(--rgb-danger))' : 'rgba(var(--rgb-accent), 0.12)',
            }}
          />
          <input type="password" value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && void handleUpdate()}
            placeholder="Confirm new password"
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
          <button onClick={() => void handleUpdate()} disabled={loading}
            className="w-full py-4 rounded-full text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))",
              color: "rgb(var(--rgb-text))",
              boxShadow: "0 4px 28px rgba(var(--rgb-accent), 0.3)",
            }}
          >
            {loading ? <Loader size={15} className="animate-spin" /> : <Check size={15} />}
            {loading ? "Updating..." : "Update Password"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
