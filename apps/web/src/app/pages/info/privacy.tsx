import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

export function Privacy() {
  const navigate = useNavigate();

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: 'rgb(var(--rgb-bg))' }}
    >
      <div
        className="flex-shrink-0 pt-[max(1.5rem,env(safe-area-inset-top))] pb-2 px-4"
        style={{
          background:
            'linear-gradient(to bottom, rgba(var(--rgb-bg), 0.98), rgba(var(--rgb-bg), 0))',
        }}
      >
        <div className="flex items-center gap-2 mt-12">
          <button
            onClick={() => void navigate(-1)}
            className="flex items-center gap-2 text-text-muted hover:text-text-muted transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span className="text-xs">Back</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        <div className="max-w-md mx-auto">
          <h2 className="text-text font-heading text-lg font-medium mb-6 mt-2">Privacy Policy</h2>

          <div className="space-y-4 text-text-muted text-sm leading-relaxed">
            <p>
              <strong className="text-text-secondary">Last updated:</strong> September 2026
            </p>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">1. Information We Collect</h3>
              <p>
                When you create an account, we collect your email address, username, and display
                name. You may optionally provide a profile photo, bio, and location. When you submit
                a prayer request, we collect its text, chosen audience, and optional coarse city and
                country location. Oratio also stores the interactions needed for features you use,
                such as comments, prayers offered, saved prayers, reports, and Prayer Circle
                connections.
              </p>
            </section>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">2. Prayer Visibility</h3>
              <p>
                Public prayers are visible to signed-in Oratio users, Prayer Circle prayers are
                limited to accepted Circle connections, and private prayers are visible only to you.
                Choosing anonymous hides your attribution from other users, but Oratio still retains
                the account association needed to manage and delete the prayer.
              </p>
            </section>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">3. How We Use Information</h3>
              <p>
                We use this information to operate, secure, and improve Oratio. Your email is used
                for account verification, password recovery, and essential account communications.
                We do not sell your personal data.
              </p>
            </section>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">4. Service Providers</h3>
              <p>
                Supabase provides authentication, database, file storage, and server functions. When
                you explicitly tap Translate, Oratio sends the selected prayer text and target
                language through its server to Google Cloud Translation. The translation request
                does not include your account email or username. We may also disclose information
                when required by law or necessary to protect users and the service.
              </p>
            </section>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">5. Storage and Security</h3>
              <p>
                Oratio data is stored using Supabase with encryption in transit and at rest. We use
                access controls to keep Circle and private content within its selected audience. No
                internet service can guarantee absolute security.
              </p>
            </section>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">6. Your Choices and Rights</h3>
              <p>
                You can edit or delete your content and permanently delete your account from
                Settings. Account deletion removes your profile and associated prayers, comments,
                connections, saved items, and other account data. You can choose whether to add a
                location, use translation, or share a prayer beyond your private space.
              </p>
            </section>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">7. Contact</h3>
              <p>
                For privacy questions or assistance, use the contact channel supplied with your beta
                invitation or visit the Oratio Support page.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
