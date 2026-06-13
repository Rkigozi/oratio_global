import { useState, useMemo, useEffect } from "react";
import {
  Send,
  LogOut,
  Edit,
  Bookmark,
  Info,
  Camera,
} from "lucide-react";
import { Drawer } from "vaul";
import { useNavigate } from "react-router";
import {
  getProfile,
  saveProfile,
  getSubmittedIds,
  getPrayedIds,
  getStoredSubmittedPrayers,
  getPrayedForPrayers,
  isUsernameAvailable,
  changeUsername,
} from "../data/profile-data";
import { validateProfile } from "../../lib/validation";
import { useAuth } from "../../lib/auth-context";
import { uploadAvatar, getInitialAvatarUrl } from "../../lib/upload";
import { getFollowCounts } from "../../lib/supabase-queries";

export function Profile() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState(getProfile);
  const [editOpen, setEditOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newBio, setNewBio] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [editError, setEditError] = useState<string>("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showSection, setShowSection] = useState<"prayers" | "saved">("prayers");

  const username = profile.username || "anonymous";
  const displayName = profile.displayName || username;

  const submittedIds = getSubmittedIds();
  const prayedIds = getPrayedIds();

  const myPrayers = useMemo(() => {
    return getStoredSubmittedPrayers();
  }, [submittedIds]);

  const myPrayedFor = useMemo(() => {
    return getPrayedForPrayers();
  }, [prayedIds]);

  const savedCount = useMemo(() => {
    try {
      return (JSON.parse(localStorage.getItem("oratio_saved") || "[]") as string[]).length;
    } catch { return 0; }
  }, []);

  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      getFollowCounts(user.id).then((counts) => setFollowingCount(counts.following));
    }
  }, [user?.id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const url = await uploadAvatar(file);
    if (url) {
      const updated = { ...profile, photo: url };
      saveProfile(updated);
      setProfile(updated);
    }
    setUploadingPhoto(false);
  };

  // Initialize edit drawer fields
  useEffect(() => {
    if (editOpen) {
      setNewDisplayName(profile.displayName);
      setNewUsername(profile.username);
      setNewBio(profile.bio || "");
      setNewLocation(profile.location || "");
      setEditError('');
    }
  }, [editOpen, profile.displayName, profile.username, profile.bio, profile.location]);

  const handleSaveProfile = () => {
    setEditError("");
    const trimmedDisplayName = newDisplayName.trim();
    const trimmedUsername = newUsername.trim().toLowerCase();

    const validation = validateProfile({
      username: trimmedUsername,
      displayName: trimmedDisplayName,
    });
    if (!validation.success) {
      const firstError = Object.values(validation.errors || {})[0];
      setEditError(firstError || "Invalid input");
      return;
    }

    if (trimmedUsername !== profile.username) {
      if (!isUsernameAvailable(trimmedUsername, profile.username)) {
        setEditError("This username is already taken");
        return;
      }
      changeUsername(profile.username, trimmedUsername);
    }

    const updatedProfile = {
      ...profile,
      username: trimmedUsername,
      displayName: trimmedDisplayName,
      bio: newBio.trim(),
      location: newLocation.trim(),
    };
    saveProfile(updatedProfile);
    setProfile(updatedProfile);
    setEditOpen(false);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: "#0A1A3A" }}>
      <div className="relative z-10 px-5 overflow-y-auto flex-1 h-full pt-24 pb-28">
        <div className="max-w-md mx-auto">
          {/* Profile header — Instagram style */}
          <div className="flex items-start gap-4 mb-6">
            <div className="relative flex-shrink-0">
              <img
                src={profile.photo || getInitialAvatarUrl(username)}
                alt=""
                className="w-20 h-20 rounded-full object-cover"
              />
              <button
                onClick={() => setEditOpen(true)}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "#0A1A3A", border: "2px solid rgba(124,143,255,0.15)" }}
              >
                <Camera size={10} className="text-[#7c8fff]" />
              </button>
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[#e2e4f0] font-heading text-base font-medium truncate">
                  {displayName}
                </h1>
                <button onClick={() => setEditOpen(true)} className="text-[#5a6080] hover:text-[#7c8fff] transition-colors cursor-pointer">
                  <Edit size={12} />
                </button>
              </div>
              <p className="text-[#5a6080] text-xs mb-1">@{username}</p>
              {profile.bio && <p className="text-[#c5cbe2] text-xs mb-1.5 leading-relaxed">{profile.bio}</p>}
              {profile.location && <p className="text-[#4e5573] text-[10px] mb-2">📍 {profile.location}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => { await signOut(); void navigate("/landing"); }}
                  className="flex items-center gap-1.5 px-4 py-1 rounded-full text-xs cursor-pointer"
                  style={{
                    background: "rgba(124,143,255,0.06)",
                    border: "1px solid rgba(124,143,255,0.1)",
                    color: "#6b7499",
                  }}
                >
                  <LogOut size={11} />
                  Sign Out
                </button>
                <button
                  onClick={() => void navigate("/info")}
                  className="flex items-center gap-1.5 px-4 py-1 rounded-full text-xs cursor-pointer"
                  style={{
                    background: "rgba(124,143,255,0.06)",
                    border: "1px solid rgba(124,143,255,0.1)",
                    color: "#6b7499",
                  }}
                >
                  <Info size={11} />
                  Info
                </button>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex justify-around mb-6 py-3 rounded-xl"
            style={{ background: "rgba(17, 26, 58, 0.4)", border: "1px solid rgba(124,143,255,0.06)" }}
          >
            <button onClick={() => setShowSection("prayers")} className="text-center cursor-pointer">
              <p className="text-[#e2e4f0] text-sm font-medium">{myPrayers.length}</p>
              <p className="text-[#5a6080] text-[10px]">Prayers</p>
            </button>
            <button onClick={() => void navigate("/profile/prayed")} className="text-center cursor-pointer">
              <p className="text-[#e2e4f0] text-sm font-medium">{myPrayedFor.length}</p>
              <p className="text-[#5a6080] text-[10px]">Prayed For</p>
            </button>
            <button onClick={() => void navigate(`/user/${encodeURIComponent(username)}/followers`)} className="text-center cursor-pointer">
              <p className="text-[#e2e4f0] text-sm font-medium">0</p>
              <p className="text-[#5a6080] text-[10px]">Followers</p>
            </button>
            <button onClick={() => void navigate(`/user/${encodeURIComponent(username)}/following`)} className="text-center cursor-pointer">
              <p className="text-[#e2e4f0] text-sm font-medium">{followingCount}</p>
              <p className="text-[#5a6080] text-[10px]">Following</p>
            </button>
            <button onClick={() => void navigate("/profile/saved")} className="text-center cursor-pointer">
              <p className="text-[#e2e4f0] text-sm font-medium">{savedCount}</p>
              <p className="text-[#5a6080] text-[10px]">Saved</p>
            </button>
          </div>

          {/* Section toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowSection("prayers")}
              className="px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer"
              style={{
                background: showSection === "prayers" ? "rgba(124,143,255,0.12)" : "rgba(124,143,255,0.04)",
                border: `1px solid ${showSection === "prayers" ? "rgba(124,143,255,0.2)" : "rgba(124,143,255,0.06)"}`,
                color: showSection === "prayers" ? "#7c8fff" : "#6b7499",
              }}
            >
              <Send size={11} className="inline mr-1" />
              My Prayers
            </button>
            <button
              onClick={() => void navigate("/profile/prayed")}
              className="px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer"
              style={{
                background: "rgba(124,143,255,0.04)",
                border: "1px solid rgba(124,143,255,0.06)",
                color: "#6b7499",
              }}
            >
              🙏 Prayed For
            </button>
            <button
              onClick={() => void navigate("/profile/saved")}
              className="px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer"
              style={{
                background: "rgba(124,143,255,0.04)",
                border: "1px solid rgba(124,143,255,0.06)",
                color: "#6b7499",
              }}
            >
              <Bookmark size={11} className="inline mr-1" />
              Saved
            </button>
          </div>

          {/* Prayer list */}
          <div className="space-y-2">
            {showSection === "prayers" && (
              myPrayers.length > 0 ? (
                <>
                {myPrayers.slice(0, 5).map((prayer) => (
                <div
                  key={prayer.id}
                  onClick={() => void navigate(`/prayer/${prayer.id}`)}
                  className="rounded-xl px-4 py-3 cursor-pointer active:scale-[0.99] transition-transform"
                  style={{
                    background: "linear-gradient(160deg, rgba(17, 26, 58, 0.5), rgba(12, 18, 48, 0.3))",
                    border: "1px solid rgba(124,143,255,0.05)",
                  }}
                >
                  <p className="text-[#d0d4e8] text-sm line-clamp-2 leading-relaxed mb-2">
                    {prayer.text}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#5a6080]">🙏 {prayer.prayerCount}</span>
                    {prayer.createdAt && (
                      <span className="text-[#4e5573] text-[10px]">
                        {new Date(prayer.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {myPrayers.length > 0 && (
                <button
                  onClick={() => void navigate("/profile/submitted")}
                  className="w-full py-2.5 text-xs text-[#7c8fff] hover:text-[#a0b0ff] transition-colors cursor-pointer"
                >
                  View all {myPrayers.length} prayers →
                </button>
              )}
              </>
              ) : (
                <div className="text-center py-8">
                  <Send size={20} className="text-[#4e5573] mx-auto mb-2" />
                  <p className="text-[#6b7499] text-sm mb-1">No prayers yet</p>
                  <button
                    onClick={() => void navigate('/submit')}
                    className="px-4 py-2 rounded-full text-xs text-[#7c8fff] bg-[rgba(124,143,255,0.08)] border border-[rgba(124,143,255,0.12)] cursor-pointer mt-2"
                  >
                    Submit Prayer
                  </button>
                </div>
              )
            )}

          </div>
        </div>
      </div>

      {/* Edit Profile Drawer */}
      <Drawer.Root open={editOpen} onOpenChange={setEditOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[600]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[600] bg-[#0A1A3A] rounded-t-2xl p-6 outline-none"
            style={{ borderTop: "1px solid rgba(124,143,255,0.1)", boxShadow: "0 -20px 60px rgba(0, 0, 0, 0.3)" }}
          >
            <div className="mx-auto w-12 h-1.5 bg-[rgba(124,143,255,0.2)] rounded-full mb-6" />
            <Drawer.Title className="sr-only">Edit Profile</Drawer.Title>
            <Drawer.Description className="sr-only">Update your username and display name</Drawer.Description>

            <div className="max-w-md mx-auto">
              <h3 className="text-[#e2e4f0] text-center mb-4 font-heading text-lg">Edit Profile</h3>

              {/* Photo upload */}
              <div className="flex justify-center mb-6">
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <img
                      src={profile.photo || getInitialAvatarUrl(username)}
                      alt=""
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                      <Camera size={16} className="text-white" />
                    </div>
                  </div>
                  <span className="text-[#7c8fff] text-xs">
                    {uploadingPhoto ? "Uploading..." : "Change Photo"}
                  </span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                </label>
              </div>

              <div className="mb-4">
                <p className="text-[#8890b5] text-xs uppercase tracking-[0.15em] mb-2 text-center">Username</p>
                <input type="text" value={newUsername}
                  onChange={(e) => { setNewUsername(e.target.value); setEditError(''); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()}
                  placeholder="username"
                  className={`w-full rounded-xl px-4 py-3.5 text-[#e2e4f0] placeholder-[#4e5573] text-sm focus:outline-none border transition-colors text-center ${editError ? 'border-[#ff6b6b]' : 'border-[rgba(124,143,255,0.12)]'}`}
                  style={{ background: "rgba(15, 20, 50, 0.6)" }}
                />
              </div>

              <div className="mb-6">
                <p className="text-[#8890b5] text-xs uppercase tracking-[0.15em] mb-2 text-center">Display Name</p>
                <input type="text" value={newDisplayName}
                  onChange={(e) => { setNewDisplayName(e.target.value); setEditError(''); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()}
                  placeholder="Leave empty to use username"
                  className={`w-full rounded-xl px-4 py-3.5 text-[#e2e4f0] placeholder-[#4e5573] text-sm focus:outline-none border transition-colors text-center ${editError ? 'border-[#ff6b6b]' : 'border-[rgba(124,143,255,0.12)]'}`}
                  style={{ background: "rgba(15, 20, 50, 0.6)" }}
                />
                {editError && <p className="text-[#ff6b6b] text-xs text-center mt-2">{editError}</p>}
              </div>

              <div className="mb-4">
                <p className="text-[#8890b5] text-xs uppercase tracking-[0.15em] mb-2 text-center">Bio</p>
                <textarea value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  placeholder="Tell people a bit about yourself..."
                  rows={2}
                  maxLength={150}
                  className="w-full rounded-xl px-4 py-3 text-[#e2e4f0] placeholder-[#4e5573] text-sm focus:outline-none border border-[rgba(124,143,255,0.12)] resize-none text-center"
                  style={{ background: "rgba(15, 20, 50, 0.6)" }}
                />
                <p className="text-[#4e5573] text-[10px] text-right mt-1">{newBio.length}/150</p>
              </div>

              <div className="mb-6">
                <p className="text-[#8890b5] text-xs uppercase tracking-[0.15em] mb-2 text-center">Location</p>
                <input type="text" value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. London, UK"
                  className="w-full rounded-xl px-4 py-3.5 text-[#e2e4f0] placeholder-[#4e5573] text-sm focus:outline-none border border-[rgba(124,143,255,0.12)] transition-colors text-center"
                  style={{ background: "rgba(15, 20, 50, 0.6)" }}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setEditOpen(false)}
                  className="flex-1 py-3.5 rounded-full text-sm text-[#8b96c0] bg-[rgba(124,143,255,0.06)] border border-[rgba(124,143,255,0.1)] cursor-pointer"
                >
                  Cancel
                </button>
                <button onClick={handleSaveProfile}
                  className="flex-1 py-3.5 rounded-full text-sm text-white bg-[linear-gradient(135deg,#7c8fff,#5a6fd6)] cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
