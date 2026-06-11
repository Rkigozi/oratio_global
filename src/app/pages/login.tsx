import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { LogIn } from "lucide-react";
import { signInWithEmail, signInWithGoogle } from "../../lib/api";

export function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      setError("Enter your email and password");
      return;
    }
    setLoading(true);
    setError("");
    const { error: signInError } = await signInWithEmail(email, password);
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
    } else {
      void navigate("/feed");
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    const { error: signInError } = await signInWithGoogle();
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
    }
  };

  return (
    <div
      className="flex flex-col min-h-screen w-full text-[#e8eaf6] relative overflow-hidden"
      style={{ background: "#0A1A3A" }}
    >
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(124, 143, 255, 0.12), transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col flex-1 justify-center px-6 max-w-sm mx-auto w-full overflow-y-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <p className="text-[#7c8fff] text-xs tracking-[0.25em] uppercase mb-4">
            Welcome back
          </p>
          <h1 className="font-heading font-light tracking-[0.2em] text-white mb-3" style={{ fontSize: "2.2rem" }}>
            ORATIO
          </h1>
          <p className="text-[#6b7499] text-sm">
            Sign in to your account
          </p>
        </motion.div>

        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder="your@email.com"
          className="w-full rounded-xl px-4 py-3.5 text-[#e2e4f0] placeholder-[#4e5573] text-sm focus:outline-none border border-[rgba(124,143,255,0.12)] focus:border-[rgba(124,143,255,0.3)] transition-colors text-center mb-3"
          style={{ background: "rgba(15, 20, 50, 0.6)" }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleEmailSignIn()}
          placeholder="Password"
          className="w-full rounded-xl px-4 py-3.5 text-[#e2e4f0] placeholder-[#4e5573] text-sm focus:outline-none border border-[rgba(124,143,255,0.12)] focus:border-[rgba(124,143,255,0.3)] transition-colors text-center mb-4"
          style={{ background: "rgba(15, 20, 50, 0.6)" }}
        />

        {error && (
          <p className="text-[#ff6b6b] text-xs text-center mb-3">{error}</p>
        )}

        <button
          onClick={handleEmailSignIn}
          disabled={loading}
          className="w-full py-4 rounded-full text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 active:scale-95 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #7c8fff, #5a6fd6)",
            color: "#ffffff",
            boxShadow: "0 4px 28px rgba(124, 143, 255, 0.3)",
          }}
        >
          <LogIn size={15} />
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[rgba(124,143,255,0.08)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#0A1A3A] px-3 text-[#4e5573] text-xs">or</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3.5 rounded-full text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 active:scale-95 disabled:opacity-50"
          style={{
            background: "rgba(124, 143, 255, 0.06)",
            color: "#e2e4f0",
            border: "1px solid rgba(124,143,255,0.1)",
          }}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? "Signing in..." : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}
