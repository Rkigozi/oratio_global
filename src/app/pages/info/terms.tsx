import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

export function Terms() {
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
          <h2 className="text-text font-heading text-lg font-medium mb-6 mt-2">Terms of Service</h2>

          <div className="space-y-4 text-text-muted text-sm leading-relaxed">
            <p><strong className="text-text-secondary">Last updated:</strong> June 2026</p>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">1. Acceptance of Terms</h3>
              <p>By using Oratio, you agree to these Terms of Service. If you do not agree, please do not use the platform.</p>
            </section>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">2. Description of Service</h3>
              <p>Oratio is a prayer platform that allows users to submit prayer requests, pray for others, and engage in supportive community interactions through comments and sharing.</p>
            </section>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">3. User Conduct</h3>
              <p>You agree to use Oratio respectfully. Prayer requests and comments should be supportive and appropriate for a global Christian community. Harassment, hate speech, and harmful content are prohibited and may be reported and removed.</p>
            </section>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">4. User Content</h3>
              <p>You retain ownership of your prayer requests and comments. By submitting content, you grant Oratio a license to display it within the platform. You may delete your content at any time.</p>
            </section>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">5. Termination</h3>
              <p>You may delete your account at any time from Settings. We reserve the right to suspend accounts that violate these terms.</p>
            </section>

            <section>
              <h3 className="text-text font-medium text-sm mb-2">6. Disclaimer</h3>
              <p>Oratio is provided "as is" without warranty. While we strive to maintain the platform, we are not liable for service interruptions or data loss.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
