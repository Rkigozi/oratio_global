import type { ReactNode } from 'react';
import { ArrowLeft, ExternalLink, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { CrisisResources } from '../../components/crisis-resources';

export function Support() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh w-full" style={{ background: 'rgb(var(--rgb-bg))' }}>
      <header className="px-5 pb-3 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-md pt-8">
          <button
            className="flex cursor-pointer items-center gap-2 text-xs text-text-muted transition-colors hover:text-text-secondary"
            onClick={() => void navigate(-1)}
            type="button"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-5 pb-16">
        <h1 className="mt-2 font-heading text-xl font-medium text-text">Oratio Support</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          Help with account access, data controls, and using Oratio during the beta.
        </p>

        <div className="mt-8 divide-y divide-border border-y border-border">
          <SupportItem
            icon={<KeyRound size={17} />}
            title="Account access"
            body="Use password reset from the sign-in screen if you cannot access your account."
          >
            <Link
              className="inline-flex items-center gap-1.5 text-xs text-accent transition-colors hover:text-text-secondary"
              to="/reset-password"
            >
              Reset password <ExternalLink size={12} />
            </Link>
          </SupportItem>
          <SupportItem
            icon={<Trash2 size={17} />}
            title="Account deletion"
            body="Signed-in users can permanently delete their account and associated data from Settings in the iOS app."
          />
          <SupportItem
            icon={<ShieldCheck size={17} />}
            title="Privacy and legal"
            body="Read how Oratio handles your information and the terms that govern the service."
          >
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Link
                className="inline-flex items-center gap-1.5 text-xs text-accent transition-colors hover:text-text-secondary"
                to="/privacy"
              >
                Privacy policy <ExternalLink size={12} />
              </Link>
              <Link
                className="inline-flex items-center gap-1.5 text-xs text-accent transition-colors hover:text-text-secondary"
                to="/terms"
              >
                Terms of service <ExternalLink size={12} />
              </Link>
            </div>
          </SupportItem>
        </div>

        <section className="mt-8">
          <h2 className="mb-3 font-heading text-sm font-medium text-text">Safety support</h2>
          <CrisisResources />
          <p className="mt-3 text-xs leading-relaxed text-text-dim">
            Oratio is not an emergency service. If someone is in immediate danger, contact local
            emergency services.
          </p>
        </section>

        <p className="mt-8 border-t border-border pt-5 text-xs leading-relaxed text-text-dim">
          During the beta, use the feedback channel supplied with your invitation for technical
          issues that are not covered here.
        </p>
      </main>
    </div>
  );
}

function SupportItem({
  body,
  children,
  icon,
  title,
}: {
  body: string;
  children?: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="flex gap-3 py-5">
      <span className="mt-0.5 text-accent">{icon}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-medium text-text-secondary">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">{body}</p>
        {children ? <div className="mt-3">{children}</div> : null}
      </div>
    </section>
  );
}
