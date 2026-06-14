import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

export function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: "rgb(var(--rgb-bg))" }}>
      <div className="flex-shrink-0 pt-[max(1.5rem,env(safe-area-inset-top))] pb-2 px-4"
        style={{ background: "linear-gradient(to bottom, rgba(var(--rgb-bg), 0.98), rgba(var(--rgb-bg), 0))" }}
      >
        <div className="flex items-center gap-2 mt-12">
          <button onClick={() => void navigate(-1)}
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
            <p><strong className="text-text-secondary">Last updated:</strong> June 2026</p>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">1. Information We Collect</h3>
              <p>When you create an account, we collect your email address, username, and display name. You may optionally provide a profile photo, bio, and location. When you submit a prayer request, we collect the prayer text and optional location data.</p>
            </section>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">2. How We Use Your Information</h3>
              <p>Your information is used to provide and improve the Oratio prayer platform. Prayer requests you submit are visible to other users. Your email is used for account-related communications only (password resets, verification).</p>
            </section>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">3. Data Storage and Security</h3>
              <p>Your data is stored securely using Supabase (PostgreSQL) with encryption in transit and at rest. We do not share your personal data with third parties except as required by law.</p>
            </section>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">4. Your Rights</h3>
              <p>You can request account deletion at any time from your Settings page. This removes all your prayers, comments, and profile data. Contact us if you need assistance.</p>
            </section>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">5. Contact</h3>
              <p>For privacy-related inquiries, please reach out through the Oratio project channels.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
