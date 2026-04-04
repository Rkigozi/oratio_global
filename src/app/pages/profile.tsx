import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Heart,
  Send,
  MapPin,
  ChevronRight,
  ChevronDown,
  Pencil,
  Check,
  LogOut,
  Trash2,
  Sparkles,
  MessageCircle,
  Camera,
  X,
} from "lucide-react";
import { Drawer } from "vaul";
import { useNavigate } from "react-router";
import { mockFeedPrayers, timeAgo, cities } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";

const AVATARS = ["🙏", "✝️", "🕊️", "💛", "🌿", "⭐", "🔥", "💜"];
const CATEGORIES = ["Health", "Family", "Career", "Guidance", "Peace", "Other"];

interface UserProfile {
  name: string;
  avatar: string;
  photo?: string;
  joinedAt: string;
}

function getProfile(): UserProfile {
  try {
    const raw = localStorage.getItem("oratio_profile");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { name: "", avatar: "🙏", joinedAt: new Date().toISOString() };
}

function saveProfile(profile: UserProfile) {
  localStorage.setItem("oratio_profile", JSON.stringify(profile));
}

function getSubmittedIds(): string[] {
  try {
    const raw = localStorage.getItem("oratio_submitted");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function getPrayedIds(): string[] {
  try {
    const raw = localStorage.getItem("oratio_prayed");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function getRemovedIds(): string[] {
  try {
    const raw = localStorage.getItem("oratio_removed");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function getAnsweredIds(): string[] {
  try {
    const raw = localStorage.getItem("oratio_answered");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function getStoredSubmittedPrayers(): PrayerRequest[] {
  try {
    const raw = localStorage.getItem("oratio_submitted_prayers");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function addToList(key: string, id: string) {
  try {
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    if (!existing.includes(id)) {
      localStorage.setItem(key, JSON.stringify([...existing, id]));
    }
  } catch {}
}

const categoryColors: Record<string, string> = {
  Health: "#67e8f9",
  Family: "#a78bfa",
  Career: "#fbbf24",
  Guidance: "#7c8fff",
  Peace: "#6ee7b7",
  Other: "#8890b5",
};

export function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(getProfile);
  const [editOpen, setEditOpen] = useState(false);
  const [profileName, setProfileName] = useState(profile.name);
  const [profileAvatar, setProfileAvatar] = useState(profile.avatar);
  const [profilePhoto, setProfilePhoto] = useState<string | undefined>(profile.photo);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"submitted" | "prayed">(
    "submitted"
  );

  // Prayer detail / action drawer
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  const [actionView, setActionView] = useState<"options" | "edit" | "confirm-delete" | "answered" | "deleted">("options");

  // Edit prayer state
  const [editText, setEditText] = useState("");
  const [editAuthorName, setEditAuthorName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [showLocDrop, setShowLocDrop] = useState(false);
  const [showCatDrop, setShowCatDrop] = useState(false);

  // Track removed/answered ids locally for instant UI updates
  const [localRemoved, setLocalRemoved] = useState<Set<string>>(() => new Set(getRemovedIds()));
  const [localAnswered, setLocalAnswered] = useState<Set<string>>(() => new Set(getAnsweredIds()));
  const [answeredCount, setAnsweredCount] = useState(getAnsweredIds().length);

  const submittedIds = getSubmittedIds();
  const prayedIds = getPrayedIds();

  const mySubmitted = useMemo(() => {
    const storedPrayers = getStoredSubmittedPrayers()
      .filter((p) => !localRemoved.has(p.id) && !localAnswered.has(p.id))
      .map((p) => ({ ...p, prayerCount: 0 }));
    return storedPrayers;
  }, [submittedIds, localRemoved, localAnswered]);

  const myPrayed = useMemo(() => {
    const allIds = new Set([...prayedIds]);
    return mockFeedPrayers.filter((p) => allIds.has(p.id));
  }, [prayedIds]);

  const activePrayers = activeTab === "submitted" ? mySubmitted : myPrayed;

  const totalPrayersReceived = mySubmitted.reduce(
    (sum, p) => sum + p.prayerCount,
    0
  );

  const handleSaveProfile = () => {
    const updated = {
      ...profile,
      name: profileName.trim() || "Anonymous",
      avatar: profileAvatar,
      photo: profilePhoto,
    };
    setProfile(updated);
    saveProfile(updated);
    setEditOpen(false);
  };

  const handleOpenPrayer = (prayer: PrayerRequest) => {
    setSelectedPrayer(prayer);
    setActionView("options");
    setShowLocDrop(false);
    setShowCatDrop(false);
  };

  const handleOpenEdit = () => {
    if (!selectedPrayer) return;
    setEditText(selectedPrayer.text);
    setEditAuthorName(selectedPrayer.name || "");
    setEditLocation(`${selectedPrayer.city}, ${selectedPrayer.country}`);
    setEditCategory(selectedPrayer.category || "Other");
    setShowLocDrop(false);
    setShowCatDrop(false);
    setActionView("edit");
  };

  const handleSavePrayer = () => {
    if (!selectedPrayer || !editText.trim()) return;
    const [cityName, countryName] = editLocation.split(", ");
    const updated: PrayerRequest = {
      ...selectedPrayer,
      text: editText.trim(),
      name: editAuthorName.trim() || undefined,
      city: cityName || selectedPrayer.city,
      country: countryName || selectedPrayer.country,
      category: editCategory,
    };
    // Update in localStorage
    try {
      const stored: PrayerRequest[] = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]");
      const next = stored.map((p) => (p.id === updated.id ? updated : p));
      localStorage.setItem("oratio_submitted_prayers", JSON.stringify(next));
    } catch {}
    setSelectedPrayer(updated);
    setActionView("options");
  };

  const handleMarkAnswered = () => {
    if (!selectedPrayer) return;
    addToList("oratio_answered", selectedPrayer.id);
    setLocalAnswered((prev) => new Set(prev).add(selectedPrayer.id));
    setAnsweredCount((c) => c + 1);
    setActionView("answered");
  };

  const handleDelete = () => {
    if (!selectedPrayer) return;
    addToList("oratio_removed", selectedPrayer.id);
    setLocalRemoved((prev) => new Set(prev).add(selectedPrayer.id));
    setActionView("deleted");
  };

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ background: "#0A1A3A" }}
    >
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(124, 143, 255, 0.04), transparent 70%)",
        }}
      />

      <div className="relative z-10 px-5 pt-24 pb-28 overflow-y-auto flex-1 h-full">
        <div className="max-w-md mx-auto">
          {/* Avatar + Name */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center mb-8"
          >
            <button
              onClick={() => {
                setProfileName(profile.name);
                setProfileAvatar(profile.avatar);
                setProfilePhoto(profile.photo);
                setEditOpen(true);
              }}
              className="relative w-20 h-20 rounded-full flex items-center justify-center mb-4 cursor-pointer group overflow-hidden"
              style={{
                background:
                  "linear-gradient(145deg, rgba(25, 32, 65, 0.9), rgba(15, 20, 50, 0.7))",
                border: "1px solid rgba(124,143,255,0.12)",
                boxShadow: "0 0 40px rgba(124, 143, 255, 0.06)",
              }}
            >
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-3xl">{profile.avatar}</span>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={18} className="text-white opacity-80" />
              </div>
            </button>

            <h2
              className="text-[#e2e4f0] font-heading mb-1"
              style={{ fontSize: "1.35rem", fontWeight: 300 }}
            >
              {profile.name || "Set up your profile"}
            </h2>
            <p className="text-[#4e5573] text-xs">
              Member since{" "}
              {new Date(profile.joinedAt).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="grid grid-cols-3 gap-2.5 mb-8"
          >
            {[
              {
                icon: Send,
                label: "Submitted",
                value: mySubmitted.length,
                color: "#7c8fff",
              },
              {
                icon: Heart,
                label: "Prayed For",
                value: myPrayed.length,
                color: "#a78bfa",
              },
              {
                icon: Sparkles,
                label: "Answered",
                value: answeredCount,
                color: "#fbbf24",
              },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.4 }}
                  className="rounded-xl p-3.5 flex flex-col items-center text-center"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(17, 26, 58, 0.8), rgba(12, 18, 48, 0.6))",
                    border: "1px solid rgba(124,143,255,0.06)",
                  }}
                >
                  <Icon
                    size={16}
                    style={{ color: stat.color }}
                    className="mb-2 opacity-70"
                  />
                  <p
                    className="text-[#e2e4f0] mb-0.5 font-heading"
                    style={{ fontSize: "1.3rem", fontWeight: 300 }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-[#4e5573] text-[10px] uppercase tracking-wider">
                    {stat.label}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Tab toggle: My Prayers / Prayed For */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex gap-1 mb-5"
          >
            {(
              [
                { id: "submitted", label: "My Prayers", icon: Send },
                { id: "prayed", label: "Prayed For", icon: Heart },
              ] as const
            ).map((t) => {
              const isActive = activeTab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs transition-all duration-300 cursor-pointer"
                  style={{
                    background: isActive
                      ? "rgba(124,143,255,0.12)"
                      : "transparent",
                    color: isActive ? "#7c8fff" : "#6b7499",
                    border: isActive
                      ? "1px solid rgba(124,143,255,0.2)"
                      : "1px solid transparent",
                  }}
                >
                  <Icon size={13} strokeWidth={isActive ? 2.2 : 1.8} />
                  {t.label}
                </button>
              );
            })}
          </motion.div>

          {/* Prayer list */}
          <div className="space-y-2.5">
            {activePrayers.length > 0 ? (
              activePrayers.map((prayer, i) => (
                <PrayerRow
                  key={prayer.id}
                  prayer={prayer}
                  index={i}
                  showCount={activeTab === "submitted"}
                  canManage={activeTab === "submitted"}
                  onTap={handleOpenPrayer}
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <p className="text-[#6b7499] text-sm mb-1">Nothing here yet</p>
                <p className="text-[#4e5573] text-xs">
                  {activeTab === "submitted"
                    ? "Submit your first prayer request"
                    : "Pray for someone in the feed"}
                </p>
              </motion.div>
            )}
          </div>

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-10 space-y-1.5"
          >
            <p className="text-[#6b7499] text-[11px] uppercase tracking-[0.15em] px-1 mb-3">
              Quick Actions
            </p>

            <button
              onClick={() => navigate("/submit")}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-colors hover:bg-[rgba(124,143,255,0.04)]"
              style={{
                background: "rgba(17, 26, 58, 0.4)",
                border: "1px solid rgba(124,143,255,0.05)",
              }}
            >
              <div className="flex items-center gap-3">
                <Send size={16} className="text-[#7c8fff] opacity-60" />
                <span className="text-[#c5cbe2] text-sm">
                  Submit a Prayer
                </span>
              </div>
              <ChevronRight size={14} className="text-[#3e4460]" />
            </button>

            <button
              onClick={() => navigate("/feed")}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-colors hover:bg-[rgba(124,143,255,0.04)]"
              style={{
                background: "rgba(17, 26, 58, 0.4)",
                border: "1px solid rgba(124,143,255,0.05)",
              }}
            >
              <div className="flex items-center gap-3">
                <Heart size={16} className="text-[#a78bfa] opacity-60" />
                <span className="text-[#c5cbe2] text-sm">
                  Browse Prayer Feed
                </span>
              </div>
              <ChevronRight size={14} className="text-[#3e4460]" />
            </button>

            <a
              href="https://forms.gle/vZP9j5ypxNVoBk7n7"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-colors hover:bg-[rgba(124,143,255,0.04)] no-underline"
              style={{
                background: "rgba(17, 26, 58, 0.4)",
                border: "1px solid rgba(124,143,255,0.05)",
              }}
            >
              <div className="flex items-center gap-3">
                <MessageCircle size={16} className="text-[#6ee7b7] opacity-60" />
                <span className="text-[#c5cbe2] text-sm">
                  Send Feedback
                </span>
              </div>
              <ChevronRight size={14} className="text-[#3e4460]" />
            </a>

            <button
              onClick={() => {
                ['oratio_profile','oratio_submitted','oratio_submitted_prayers','oratio_prayed','oratio_removed','oratio_answered'].forEach(k => localStorage.removeItem(k));
                sessionStorage.removeItem('oratio_visited');
                navigate("/splash");
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-colors hover:bg-[rgba(124,143,255,0.04)] mt-4"
              style={{
                background: "transparent",
              }}
            >
              <div className="flex items-center gap-3">
                <LogOut size={16} className="text-[#5a6080] opacity-60" />
                <span className="text-[#5a6080] text-sm">Sign Out</span>
              </div>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Edit Profile Drawer */}
      <Drawer.Root
        open={editOpen}
        onOpenChange={(o) => {
          if (!o) setEditOpen(false);
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[600]" />
          <Drawer.Content
            className="flex flex-col rounded-t-[1.5rem] fixed bottom-0 left-0 right-0 z-[600] focus:outline-none"
            style={{
              background: "linear-gradient(180deg, #111a3a, #0c1230)",
              borderTop: "1px solid rgba(124, 143, 255, 0.1)",
            }}
          >
            <Drawer.Title className="sr-only">Edit Profile</Drawer.Title>
            <Drawer.Description className="sr-only">
              Update your display name and avatar
            </Drawer.Description>

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[rgba(124,143,255,0.2)]" />
            </div>

            <div className="max-w-md w-full mx-auto p-6 pt-3">
              <h3
                className="text-[#e2e4f0] font-heading text-center mb-6"
                style={{ fontSize: "1.15rem", fontWeight: 300 }}
              >
                Edit Profile
              </h3>

              {/* Photo upload */}
              <p className="text-[#6b7499] text-xs uppercase tracking-[0.15em] mb-3">
                Profile Photo <span className="text-[#3e4460] normal-case tracking-normal">(optional)</span>
              </p>
              <div className="flex items-center gap-4 mb-6">
                {/* Preview */}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{
                    background: "linear-gradient(145deg, rgba(25,32,65,0.9), rgba(15,20,50,0.7))",
                    border: "1px solid rgba(124,143,255,0.15)",
                  }}
                >
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{profileAvatar}</span>
                  )}
                </div>

                <div className="flex gap-2 flex-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs cursor-pointer transition-all duration-200"
                    style={{
                      background: "rgba(124,143,255,0.08)",
                      border: "1px solid rgba(124,143,255,0.18)",
                      color: "#8890b5",
                    }}
                  >
                    <Camera size={13} />
                    {profilePhoto ? "Change" : "Upload"}
                  </button>
                  {profilePhoto && (
                    <button
                      onClick={() => setProfilePhoto(undefined)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer transition-all duration-200"
                      style={{
                        background: "rgba(255,107,107,0.06)",
                        border: "1px solid rgba(255,107,107,0.12)",
                      }}
                    >
                      <X size={13} className="text-[#ff6b6b] opacity-70" />
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setProfilePhoto(ev.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Avatar picker */}
              <p className="text-[#6b7499] text-xs uppercase tracking-[0.15em] mb-3">
                {profilePhoto ? "Fallback icon" : "Choose an icon"}
              </p>
              <div className="flex gap-2 mb-6 flex-wrap">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setProfileAvatar(emoji)}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-xl cursor-pointer transition-all duration-200"
                    style={{
                      background:
                        profileAvatar === emoji
                          ? "rgba(124,143,255,0.15)"
                          : "rgba(17, 26, 58, 0.5)",
                      border:
                        profileAvatar === emoji
                          ? "1px solid rgba(124,143,255,0.3)"
                          : "1px solid rgba(124,143,255,0.08)",
                      transform:
                        profileAvatar === emoji ? "scale(1.1)" : "scale(1)",
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Name input */}
              <p className="text-[#6b7499] text-xs uppercase tracking-[0.15em] mb-2">
                Your name
              </p>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="How should others see you?"
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-[#e2e4f0] placeholder-[#4e5573] text-sm focus:outline-none border border-[rgba(124,143,255,0.15)] focus:border-[rgba(124,143,255,0.3)] transition-colors mb-6"
                style={{ background: "rgba(15, 20, 50, 0.6)" }}
              />

              {/* Save button */}
              <button
                onClick={handleSaveProfile}
                className="w-full py-3.5 rounded-full text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #7c8fff, #5a6fd6)",
                  color: "#ffffff",
                  boxShadow:
                    "0 4px 24px rgba(124, 143, 255, 0.25), 0 0 0 1px rgba(124,143,255,0.1)",
                }}
              >
                <Check size={16} />
                Save Changes
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Prayer Action Drawer */}
      <Drawer.Root
        open={!!selectedPrayer}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedPrayer(null);
            setActionView("options");
          }
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[600]" />
          <Drawer.Content
            className="flex flex-col rounded-t-[1.5rem] fixed bottom-0 left-0 right-0 z-[600] max-h-[85vh] focus:outline-none"
            style={{
              background: "linear-gradient(180deg, #111a3a, #0c1230)",
              borderTop: "1px solid rgba(124, 143, 255, 0.1)",
            }}
          >
            <Drawer.Title className="sr-only">Prayer Options</Drawer.Title>
            <Drawer.Description className="sr-only">
              Manage your prayer request
            </Drawer.Description>

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[rgba(124,143,255,0.2)]" />
            </div>

            <div className="max-w-md w-full mx-auto p-6 pt-2 flex-1 overflow-auto">
              {selectedPrayer && (
                <AnimatePresence mode="wait">
                  {/* ── Options view ───────────────────────────── */}
                  {actionView === "options" && (
                    <motion.div
                      key="options"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Prayer preview */}
                      <div className="flex items-center gap-2 mb-1 justify-center">
                        <MapPin size={12} className="text-[#5a6080]" />
                        <p className="text-[#6b7499] text-xs">
                          {selectedPrayer.city}, {selectedPrayer.country}
                        </p>
                      </div>
                      {selectedPrayer.createdAt && (
                        <p className="text-[#3e4460] text-[11px] mb-5 text-center">
                          {timeAgo(selectedPrayer.createdAt)}
                        </p>
                      )}

                      <p
                        className="text-[#d0d4e8] text-center mb-3 max-w-xs mx-auto"
                        style={{ fontSize: "0.95rem", lineHeight: 1.7 }}
                      >
                        &ldquo;{selectedPrayer.text}&rdquo;
                      </p>

                      {selectedPrayer.name && (
                        <p className="text-[#5a6080] text-xs text-center mb-2">
                          &mdash; {selectedPrayer.name}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 justify-center text-[#5a6080] text-xs mb-8">
                        <Heart size={11} className="text-[#7c8fff] opacity-60" />
                        <span>{selectedPrayer.prayerCount} people prayed</span>
                      </div>

                      {/* Action buttons */}
                      <div className="space-y-2.5">
                        {/* Edit */}
                        <button
                          onClick={handleOpenEdit}
                          className="w-full flex items-center gap-3 px-5 py-4 rounded-xl cursor-pointer transition-all duration-200 hover:bg-[rgba(124,143,255,0.08)]"
                          style={{
                            background: "rgba(124, 143, 255, 0.04)",
                            border: "1px solid rgba(124, 143, 255, 0.12)",
                          }}
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(124, 143, 255, 0.1)" }}
                          >
                            <Pencil size={16} className="text-[#7c8fff]" />
                          </div>
                          <div className="text-left">
                            <p className="text-[#e2e4f0] text-sm mb-0.5">Edit Prayer</p>
                            <p className="text-[#5a6080] text-[11px]">Update your prayer request</p>
                          </div>
                        </button>

                        <button
                          onClick={handleMarkAnswered}
                          className="w-full flex items-center gap-3 px-5 py-4 rounded-xl cursor-pointer transition-all duration-200 hover:bg-[rgba(251,191,36,0.08)]"
                          style={{
                            background: "rgba(251, 191, 36, 0.04)",
                            border: "1px solid rgba(251, 191, 36, 0.12)",
                          }}
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              background: "rgba(251, 191, 36, 0.1)",
                            }}
                          >
                            <Sparkles size={16} className="text-[#fbbf24]" />
                          </div>
                          <div className="text-left">
                            <p className="text-[#e2e4f0] text-sm mb-0.5">
                              Mark as Answered
                            </p>
                            <p className="text-[#5a6080] text-[11px]">
                              Celebrate God&apos;s faithfulness
                            </p>
                          </div>
                        </button>

                        <button
                          onClick={() => setActionView("confirm-delete")}
                          className="w-full flex items-center gap-3 px-5 py-4 rounded-xl cursor-pointer transition-all duration-200 hover:bg-[rgba(255,107,107,0.06)]"
                          style={{
                            background: "rgba(255, 107, 107, 0.02)",
                            border: "1px solid rgba(255, 107, 107, 0.08)",
                          }}
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              background: "rgba(255, 107, 107, 0.08)",
                            }}
                          >
                            <Trash2 size={16} className="text-[#ff6b6b] opacity-70" />
                          </div>
                          <div className="text-left">
                            <p className="text-[#c5cbe2] text-sm mb-0.5">
                              Delete Prayer
                            </p>
                            <p className="text-[#5a6080] text-[11px]">
                              Remove from the feed
                            </p>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Edit view ──────────────────────────────── */}
                  {actionView === "edit" && (
                    <motion.div
                      key="edit"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      <h3
                        className="text-[#e2e4f0] font-heading text-center mb-5"
                        style={{ fontSize: "1.1rem", fontWeight: 300 }}
                      >
                        Edit Prayer
                      </h3>

                      <div className="space-y-4">
                        {/* Prayer text */}
                        <div>
                          <label className="text-[#6b7499] text-xs uppercase tracking-[0.12em] mb-2 block">
                            Prayer message
                          </label>
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={4}
                            className="w-full rounded-xl px-4 py-3 text-[#e8eaf6] placeholder-[#5a5f80] resize-none border border-[rgba(124,143,255,0.12)] focus:border-[rgba(124,143,255,0.35)] focus:outline-none transition-colors"
                            style={{ background: "rgba(15, 20, 50, 0.6)", lineHeight: 1.7 }}
                          />
                        </div>

                        {/* Name */}
                        <div>
                          <label className="text-[#6b7499] text-xs uppercase tracking-[0.12em] mb-2 block">
                            Name <span className="text-[#4e5573] normal-case tracking-normal">(optional)</span>
                          </label>
                          <input
                            type="text"
                            value={editAuthorName}
                            onChange={(e) => setEditAuthorName(e.target.value)}
                            placeholder="Anonymous"
                            className="w-full rounded-xl px-4 py-3 text-[#e8eaf6] placeholder-[#5a5f80] border border-[rgba(124,143,255,0.12)] focus:border-[rgba(124,143,255,0.35)] focus:outline-none transition-colors"
                            style={{ background: "rgba(15, 20, 50, 0.6)" }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Location */}
                          <div className="relative">
                            <label className="text-[#6b7499] text-xs uppercase tracking-[0.12em] mb-2 block">Location</label>
                            <button
                              type="button"
                              onClick={() => { setShowLocDrop(!showLocDrop); setShowCatDrop(false); }}
                              className="w-full rounded-xl px-3 py-3 text-left flex items-center justify-between border border-[rgba(124,143,255,0.12)] focus:outline-none transition-colors cursor-pointer"
                              style={{ background: "rgba(15, 20, 50, 0.6)" }}
                            >
                              <span className="text-[#e8eaf6] text-xs truncate">{editLocation.split(",")[0]}</span>
                              <ChevronDown size={14} className="text-[#8890b5] flex-shrink-0" />
                            </button>
                            <AnimatePresence>
                              {showLocDrop && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -4 }}
                                  className="absolute top-full mt-1 left-0 right-0 max-h-40 overflow-y-auto rounded-xl border border-[rgba(124,143,255,0.15)] z-30"
                                  style={{ background: "rgba(15, 20, 55, 0.98)", backdropFilter: "blur(20px)" }}
                                >
                                  {cities.map((city) => (
                                    <button
                                      key={city}
                                      type="button"
                                      onClick={() => { setEditLocation(city); setShowLocDrop(false); }}
                                      className="w-full text-left px-3 py-2.5 text-xs text-[#c5cdff] hover:bg-[rgba(124,143,255,0.1)] transition-colors cursor-pointer truncate"
                                    >
                                      {city}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Category */}
                          <div className="relative">
                            <label className="text-[#6b7499] text-xs uppercase tracking-[0.12em] mb-2 block">Category</label>
                            <button
                              type="button"
                              onClick={() => { setShowCatDrop(!showCatDrop); setShowLocDrop(false); }}
                              className="w-full rounded-xl px-3 py-3 text-left flex items-center justify-between border border-[rgba(124,143,255,0.12)] focus:outline-none transition-colors cursor-pointer"
                              style={{ background: "rgba(15, 20, 50, 0.6)" }}
                            >
                              <span className="text-[#e8eaf6] text-xs truncate">{editCategory}</span>
                              <ChevronDown size={14} className="text-[#8890b5] flex-shrink-0" />
                            </button>
                            <AnimatePresence>
                              {showCatDrop && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -4 }}
                                  className="absolute top-full mt-1 left-0 right-0 rounded-xl border border-[rgba(124,143,255,0.15)] z-30"
                                  style={{ background: "rgba(15, 20, 55, 0.98)", backdropFilter: "blur(20px)" }}
                                >
                                  {CATEGORIES.map((cat) => (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => { setEditCategory(cat); setShowCatDrop(false); }}
                                      className="w-full text-left px-3 py-2.5 text-xs text-[#c5cdff] hover:bg-[rgba(124,143,255,0.1)] transition-colors cursor-pointer"
                                    >
                                      {cat}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={() => setActionView("options")}
                            className="flex-1 py-3 rounded-full text-sm text-[#8b96c0] bg-[rgba(124,143,255,0.06)] border border-[rgba(124,143,255,0.1)] hover:bg-[rgba(124,143,255,0.12)] transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSavePrayer}
                            disabled={!editText.trim()}
                            className="flex-1 py-3 rounded-full text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
                            style={{
                              background: "linear-gradient(135deg, #7c8fff, #5a6fd6)",
                              color: "#ffffff",
                              boxShadow: "0 4px 20px rgba(124, 143, 255, 0.25)",
                            }}
                          >
                            <Check size={15} />
                            Save
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Confirm delete view ────────────────────── */}
                  {actionView === "confirm-delete" && (
                    <motion.div
                      key="confirm-delete"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.25 }}
                      className="text-center py-4"
                    >
                      <div
                        className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center"
                        style={{
                          background: "rgba(255, 107, 107, 0.08)",
                          border: "1px solid rgba(255, 107, 107, 0.12)",
                        }}
                      >
                        <Trash2 size={22} className="text-[#ff6b6b] opacity-70" />
                      </div>

                      <h3
                        className="text-[#e2e4f0] font-heading mb-2"
                        style={{ fontSize: "1.1rem", fontWeight: 300 }}
                      >
                        Delete this prayer?
                      </h3>
                      <p className="text-[#6b7499] text-sm mb-8 max-w-xs mx-auto">
                        This will remove it from the global feed.
                        Others will no longer be able to pray for it.
                      </p>

                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => setActionView("options")}
                          className="px-6 py-2.5 rounded-full text-sm text-[#8b96c0] bg-[rgba(124,143,255,0.06)] border border-[rgba(124,143,255,0.1)] hover:bg-[rgba(124,143,255,0.12)] transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDelete}
                          className="px-6 py-2.5 rounded-full text-sm text-[#ff6b6b] bg-[rgba(255,107,107,0.08)] border border-[rgba(255,107,107,0.15)] hover:bg-[rgba(255,107,107,0.15)] transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Answered confirmation ──────────────────── */}
                  {actionView === "answered" && (
                    <motion.div
                      key="answered"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className="text-center py-6 flex flex-col items-center"
                    >
                      {/* Golden glow orb */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", damping: 16, stiffness: 140 }}
                        className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.03))",
                          boxShadow: "0 0 60px rgba(251, 191, 36, 0.1)",
                        }}
                      >
                        <motion.div
                          animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          <Sparkles size={32} className="text-[#fbbf24]" />
                        </motion.div>
                      </motion.div>

                      <h3
                        className="text-[#e2e4f0] font-heading mb-2"
                        style={{ fontSize: "1.25rem", fontWeight: 300 }}
                      >
                        Prayer Answered
                      </h3>
                      <p className="text-[#8890b5] text-sm mb-2 max-w-xs">
                        Glory to God! Your prayer has been answered.
                      </p>
                      <p className="text-[#5a6080] text-xs mb-8">
                        {selectedPrayer.prayerCount} people prayed with you
                      </p>

                      <button
                        onClick={() => setSelectedPrayer(null)}
                        className="px-8 py-2.5 rounded-full text-sm text-[#fbbf24] bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.15)] hover:bg-[rgba(251,191,36,0.12)] transition-all cursor-pointer"
                      >
                        Amen
                      </button>
                    </motion.div>
                  )}

                  {/* ── Deleted confirmation ───────────────────── */}
                  {actionView === "deleted" && (
                    <motion.div
                      key="deleted"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-center py-8"
                    >
                      <div
                        className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(124,143,255,0.08), transparent)",
                        }}
                      >
                        <Check size={24} className="text-[#6b7499]" />
                      </div>

                      <h3
                        className="text-[#e2e4f0] font-heading mb-2"
                        style={{ fontSize: "1.1rem", fontWeight: 300 }}
                      >
                        Prayer Removed
                      </h3>
                      <p className="text-[#6b7499] text-sm mb-6">
                        It has been removed from the feed.
                      </p>

                      <button
                        onClick={() => setSelectedPrayer(null)}
                        className="px-6 py-2.5 rounded-full text-sm text-[#8b96c0] bg-[rgba(124,143,255,0.06)] border border-[rgba(124,143,255,0.1)] hover:bg-[rgba(124,143,255,0.12)] transition-all cursor-pointer"
                      >
                        Done
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}

/* ── Compact prayer row for profile lists ────────────────────────────── */
function PrayerRow({
  prayer,
  index,
  showCount,
  canManage,
  onTap,
}: {
  prayer: PrayerRequest;
  index: number;
  showCount: boolean;
  canManage: boolean;
  onTap: (prayer: PrayerRequest) => void;
}) {
  const catColor =
    categoryColors[prayer.category || "Other"] || "#8890b5";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.5), duration: 0.35 }}
      onClick={canManage ? () => onTap(prayer) : undefined}
      className={`rounded-xl px-4 py-3.5 relative overflow-hidden ${canManage ? "cursor-pointer active:scale-[0.98] transition-transform duration-150" : ""}`}
      style={{
        background:
          "linear-gradient(160deg, rgba(17, 26, 58, 0.6), rgba(12, 18, 48, 0.4))",
        border: "1px solid rgba(124,143,255,0.06)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className="text-[#d0d4e8] line-clamp-2 mb-2"
            style={{ fontSize: "0.85rem", lineHeight: 1.6 }}
          >
            &ldquo;{prayer.text}&rdquo;
          </p>
          <div className="flex items-center gap-2">
            <MapPin size={10} className="text-[#5a6080] flex-shrink-0" />
            <span className="text-[#5a6080] text-[11px]">
              {prayer.city}
            </span>
            {prayer.category && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                style={{
                  color: catColor,
                  background: `${catColor}12`,
                  border: `1px solid ${catColor}18`,
                }}
              >
                {prayer.category}
              </span>
            )}
            {prayer.createdAt && (
              <span className="text-[#3e4460] text-[10px] ml-auto">
                {timeAgo(prayer.createdAt)}
              </span>
            )}
          </div>
        </div>

        {showCount && (
          <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
            <Heart size={11} className="text-[#7c8fff] opacity-60" />
            <span className="text-[#6b7499] text-[11px]">
              {prayer.prayerCount}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}