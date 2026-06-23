import { useState, useEffect } from "react";
import { Bell, Globe, MessageCircle, Shield, Trash2, AlertTriangle, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { useAuth } from '../../hooks/auth-context';
import { useTheme } from '../../hooks/theme-context';
import {
  getProfilePreferences,
  updateProfilePreferences,
  deleteAccount,
  type ProfilePreferences,
} from '../../services/supabase-queries';
import { LoadingSpinner } from "../../components/loading-spinner";

const languages = [
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "pt", label: "Portuguese" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
];

export function ProfileSettings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [prefs, setPrefs] = useState<ProfilePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");
    const err = await deleteAccount();
    if (err) {
      setDeleteError(err);
      setDeleting(false);
    } else {
      // Account deleted — sign out and redirect
      await signOut();
      void navigate("/landing");
    }
  };

  useEffect(() => {
    let active = true;

    const loadPreferences = async () => {
      setLoading(true);
      try {
        if (!user) return;
        const profilePrefs = await getProfilePreferences();
        if (active) setPrefs(profilePrefs);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPreferences();

    return () => {
      active = false;
    };
  }, [user]);

  const update = (key: keyof ProfilePreferences, value: boolean | string) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSaving(true);
    void updateProfilePreferences({ [key]: value }).finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full" style={{ background: "rgb(var(--rgb-bg))" }}>
        <LoadingSpinner text="Loading settings..." />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: "rgb(var(--rgb-bg))" }}>
      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-24">
        <div className="max-w-md mx-auto">
          <h2 className="text-text font-heading text-base font-medium mb-6 mt-2">Settings</h2>

          {/* Appearance */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              {theme === "dark" ? <Sun size={14} className="text-text-dim" /> : <Moon size={14} className="text-text-dim" />}
              <p className="text-text-muted text-xs uppercase tracking-[0.15em]">Appearance</p>
            </div>
            <ToggleRow
              icon={theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
              label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              enabled={theme === "light"}
              onChange={toggleTheme}
            />
          </div>

          {/* Notifications */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={14} className="text-text-dim" />
              <p className="text-text-muted text-xs uppercase tracking-[0.15em]">Notifications</p>
            </div>
            <div className="space-y-2">
              <ToggleRow
                icon={<Bell size={13} />}
                label="Notify when someone prays for my prayer"
                enabled={prefs?.notify_on_prayed ?? true}
                onChange={(v) => update("notify_on_prayed", v)}
              />
              <ToggleRow
                icon={<MessageCircle size={13} />}
                label="Notify when someone comments on my prayer"
                enabled={prefs?.notify_on_comment ?? true}
                onChange={(v) => update("notify_on_comment", v)}
              />
            </div>
            <p className="text-text-dim text-[10px] mt-2">Push notifications are coming soon. These preferences will be used once available.</p>
          </div>

          {/* Language */}

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={14} className="text-text-dim" />
              <p className="text-text-muted text-xs uppercase tracking-[0.15em]">Translation Language</p>
            </div>
            <div
              className="rounded-xl px-4 py-2 border border-accent/12"
              style={{ background: "rgba(var(--rgb-surface), 0.6)" }}
            >
              <select
                value={prefs?.language ?? "auto"}
                onChange={(e) => update("language", e.target.value)}
                className="w-full py-2 text-text text-sm bg-transparent focus:outline-none appearance-none cursor-pointer"
              >
                {languages.map((l) => (
                  <option key={l.value} value={l.value} className="bg-bg">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-text-dim text-[10px] mt-2">Choose your preferred language for prayer translations.</p>
          </div>

          {/* Defaults */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={14} className="text-text-dim" />
              <p className="text-text-muted text-xs uppercase tracking-[0.15em]">Comment Defaults</p>
            </div>
            <ToggleRow
              icon={<MessageCircle size={13} />}
              label="Enable comments on new prayers by default"
              enabled={prefs?.comments_enabled_default ?? true}
              onChange={(v) => update("comments_enabled_default", v)}
            />
          </div>

          {/* Account */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-text-dim" />
              <p className="text-text-muted text-xs uppercase tracking-[0.15em]">Account</p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full rounded-xl px-4 py-3 border border-danger/20 flex items-center gap-3 cursor-pointer hover:bg-danger/4 transition-colors"
              style={{ background: "rgba(var(--rgb-surface), 0.5)" }}
            >
              <Trash2 size={14} className="text-danger" />
              <div className="text-left">
                <p className="text-danger text-sm">Delete Account</p>
                <p className="text-text-dim text-[10px]">Permanently delete your account and all data</p>
              </div>
            </button>
          </div>

          {saving && (
            <p className="text-center text-accent text-[10px]">Saving...</p>
          )}
        </div>
      </div>

      {/* Delete account confirmation */}
      {createPortal(
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              style={{ background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)" }}
              onClick={() => !deleting && setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                className="w-full max-w-sm rounded-2xl p-5 border border-accent/10"
                style={{ background: "rgba(15, 22, 55, 0.98)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-danger/10">
                    <AlertTriangle size={20} className="text-danger" />
                  </div>
                  <div>
                    <p className="text-text-secondary text-sm font-medium">Delete Account</p>
                    <p className="text-text-muted text-xs">This action cannot be undone.</p>
                  </div>
                </div>
                <p className="text-text-muted text-xs mb-5 leading-relaxed">
                  All your prayers, comments, follows, and saved prayers will be permanently deleted. Your username will be released for others to use.
                </p>
                {deleteError && (
                  <p className="text-danger text-xs mb-3 text-center">{deleteError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-full text-sm text-text-muted bg-accent/6 border border-accent/10 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleDeleteAccount()}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-full text-sm text-white cursor-pointer disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, rgb(var(--rgb-danger)), #e05555)" }}
                  >
                    {deleting ? "Deleting..." : "Delete Forever"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  enabled,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3 border border-accent/8"
      style={{ background: "rgba(var(--rgb-surface), 0.5)" }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-text-dim">{icon}</span>
        <span className="text-text-secondary text-xs">{label}</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className="relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
        style={{
          background: enabled ? "rgba(var(--rgb-accent), 0.35)" : "rgba(var(--rgb-accent), 0.12)",
        }}
      >
        <div
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-md"
          style={{
            transform: enabled ? "translateX(22px)" : "translateX(2px)",
          }}
        />
      </button>
    </div>
  );
}
