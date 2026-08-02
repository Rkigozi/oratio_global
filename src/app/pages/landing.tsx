import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Globe,
  Heart,
  MessageCircle,
  ArrowRight,
  Mail,
  PlusCircle,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../hooks/auth-context';
import { BetaBadge } from '../components/beta-badge';
import { BETA } from '../config';

export function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  // Redirect to feed if already signed in
  useEffect(() => {
    if (!loading && user) void navigate('/feed', { replace: true });
  }, [user, loading, navigate]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const { subscribeToWaitlist } = await import('../services/supabase-queries');
    const result = await subscribeToWaitlist(email, 'landing');
    if (result === 'error') return;
    setSubscribed(true);
  };

  const features = [
    {
      icon: Globe,
      title: 'Global Prayer Map',
      desc: 'See prayers rising from every corner of the world. You are part of something bigger.',
    },
    {
      icon: Heart,
      title: 'Pray for One Another',
      desc: 'A single tap sends a ripple of faith. Pray for requests from around the world.',
    },
    {
      icon: MessageCircle,
      title: 'Encourage & Connect',
      desc: 'Leave encouragement, pray for anyone, and share more closely with your Prayer Circle.',
    },
  ];

  return (
    <div
      className="auth-page-scroll flex w-full flex-col"
      style={{ background: 'rgb(var(--rgb-bg))' }}
    >
      {/* Ambient glow */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[200px] pointer-events-none opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(var(--rgb-accent), 0.4), transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl mx-auto px-6 pt-16 pb-24">
        {/* Hero */}
        <div className="oratio-fade-up text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-5">
            <h1
              className="font-heading text-text-secondary"
              style={{
                fontSize: 'clamp(2.85rem, 8vw, 4.5rem)',
                fontWeight: 300,
                letterSpacing: '0.08em',
              }}
            >
              ORATIO
            </h1>
            <BetaBadge className="mt-2" />
          </div>
          <p className="text-text-muted text-base md:text-lg mb-2 font-light tracking-[0.3em] uppercase">
            Pray Together. Anywhere.
          </p>
          <p className="text-text-dim text-sm max-w-md mx-auto mb-7 leading-relaxed">
            A global Christian prayer platform. Share your needs, pray for others, and experience
            the power of a worldwide prayer community.
          </p>

          <div className="flex flex-col items-center gap-3 mb-7">
            <button
              onClick={() => void navigate('/onboarding')}
              className="min-h-12 px-8 py-3 rounded-full text-sm font-medium text-white cursor-pointer transition-all active:scale-95"
              style={{
                background:
                  'linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))',
                boxShadow: '0 4px 28px rgba(var(--rgb-accent), 0.3)',
              }}
            >
              Create Account
            </button>
            <button
              onClick={() => void navigate('/login')}
              className="inline-flex min-h-11 items-center gap-2 px-4 text-accent text-sm hover:text-accent transition-colors cursor-pointer"
            >
              Sign in
              <ArrowRight size={14} />
            </button>
          </div>

          {/* PWA install cues */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-7">
            <div
              className="inline-flex min-h-10 items-center gap-2.5 px-5 py-2.5 rounded-full text-sm opacity-85"
              style={{
                background: 'rgba(var(--rgb-bg), 0.3)',
                border: '1px solid rgba(var(--rgb-text), 0.1)',
              }}
            >
              <Smartphone size={16} className="text-text-muted" />
              <span className="text-text-muted text-sm">Works on iPhone & Android</span>
            </div>
            <div
              className="inline-flex min-h-10 items-center gap-2.5 px-5 py-2.5 rounded-full text-sm opacity-85"
              style={{
                background: 'rgba(var(--rgb-bg), 0.3)',
                border: '1px solid rgba(var(--rgb-text), 0.1)',
              }}
            >
              <PlusCircle size={16} className="text-text-muted" />
              <span className="text-text-muted text-sm">Add to Home Screen</span>
            </div>
          </div>

          {/* Beta updates */}
          <div className="w-full max-w-sm mx-auto">
            <p className="text-text-dim text-xs mb-3 text-center">
              Get occasional beta updates. We&apos;ll never spam you.
            </p>
            {subscribed ? (
              <div className="oratio-fade-soft">
                <p className="text-accent text-sm py-3 text-center">You&apos;re on the list! 🙏</p>
                <button
                  onClick={() => {
                    setSubscribed(false);
                    setEmail('');
                  }}
                  className="text-text-dim text-[10px] hover:text-text-muted transition-colors cursor-pointer block mx-auto"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubscribe(e)} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 min-w-0 rounded-xl px-4 py-3 text-text placeholder-text-dim text-sm focus:outline-none border border-accent/12"
                  style={{ background: 'rgba(var(--rgb-surface), 0.6)' }}
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl text-sm text-white cursor-pointer transition-all active:scale-95 flex items-center gap-2"
                  style={{
                    background:
                      'linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))',
                  }}
                >
                  <Mail size={14} />
                  Save
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="oratio-fade-up w-full max-w-2xl mx-auto mb-16 [animation-delay:120ms]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="oratio-fade-up rounded-xl px-5 py-5 text-center"
                style={{
                  animationDelay: `${220 + i * 70}ms`,
                  background:
                    'linear-gradient(160deg, rgba(var(--rgb-surface), 0.6), rgba(var(--rgb-surface), 0.4))',
                  border: '1px solid rgba(var(--rgb-accent), 0.06)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'rgba(var(--rgb-accent), 0.08)' }}
                >
                  <feature.icon size={16} className="text-accent" />
                </div>
                <h3 className="text-text-secondary text-sm font-medium mb-1.5">{feature.title}</h3>
                <p className="text-text-muted text-xs leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="w-full text-center mt-10 pt-6 border-t border-accent/6 space-y-2">
          {BETA.isBeta && (
            <p className="text-text-dim text-[11px] font-light italic">{BETA.notice}</p>
          )}
          <p className="text-text-faint text-[10px]">Oratio · A global Christian prayer platform</p>
        </div>
      </div>
    </div>
  );
}
