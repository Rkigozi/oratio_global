import { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import {
  Heart,
  Send,
  LogOut,
  ChevronDown,
  Edit,
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
import { Header } from "../components/header";

export function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(getProfile);
  const [editOpen, setEditOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [editError, setEditError] = useState<string>("");
  
  const handleSaveProfile = () => {
    setEditError("");
    const trimmedDisplayName = newDisplayName.trim();
    const trimmedUsername = newUsername.trim().toLowerCase();
    
    // Validate both fields
    const validation = validateProfile({
      username: trimmedUsername,
      displayName: trimmedDisplayName,
    });
    if (!validation.success) {
      // Show first error
      const firstError = Object.values(validation.errors || {})[0];
      setEditError(firstError || "Invalid input");
      return;
    }
    
    // Check username uniqueness if changed
    if (trimmedUsername !== profile.username) {
      if (!isUsernameAvailable(trimmedUsername, profile.username)) {
        setEditError("This username is already taken");
        return;
      }
      // Update username in prayers and used list
      changeUsername(profile.username, trimmedUsername);
    }
    
    const updatedProfile = {
      ...profile,
      username: trimmedUsername,
      displayName: trimmedDisplayName,
    };
    saveProfile(updatedProfile);
    setProfile(updatedProfile);
    setEditOpen(false);
  };

  useEffect(() => {
    if (editOpen) {
      setNewDisplayName(profile.displayName);
      setNewUsername(profile.username);
      setEditError('');
    }
  }, [editOpen, profile.displayName, profile.username]);

  const submittedIds = getSubmittedIds();
  const prayedIds = getPrayedIds();

  const mySubmitted = useMemo(() => {
    const storedPrayers = getStoredSubmittedPrayers()
      .map((p) => ({ ...p, prayerCount: 0 }));
    return storedPrayers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedIds]);

  const myPrayed = useMemo(() => {
    return getPrayedForPrayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prayedIds]);

  // Get recent items for preview (max 3 each)
  const recentSubmitted = useMemo(() => 
    mySubmitted.slice(0, 3), [mySubmitted]
  );
  const recentPrayed = useMemo(() => 
    myPrayed.slice(0, 3), [myPrayed]
  );

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: "#0A1A3A" }}
    >
      <Header />

      {/* Decorative background elements */}
      <div
        className="absolute top-0 left-0 w-full h-40 z-0 opacity-30"
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
            <div
              className="relative w-20 h-20 rounded-full flex items-center justify-center mb-4 overflow-hidden"
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
            </div>

            <div className="flex items-center justify-center gap-2">
              <h2
                className="text-[#e2e4f0] font-heading mb-1"
                style={{ fontSize: "1.35rem", fontWeight: 300 }}
              >
                {profile.displayName || profile.username || "Set up your profile"}
              </h2>
              <button
                onClick={() => setEditOpen(true)}
                className="text-[#5a6080] hover:text-[#7c8fff] transition-colors"
              >
                <Edit size={14} />
              </button>
            </div>
            {profile.username && (
              <p className="text-[#5a6080] text-xs mb-0.5">
                @{profile.username}
              </p>
            )}
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
            className="grid grid-cols-2 gap-2 mb-8"
          >
            {[
              {
                icon: Send,
                label: "Submitted",
                value: mySubmitted.length,
                color: "#7c8fff",
                path: "/profile/submitted",
              },
              {
                icon: Heart,
                label: "Prayed For",
                value: myPrayed.length,
                color: "#a78bfa",
                path: "/profile/prayed",
              },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.button
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.4 }}
                  className="rounded-xl p-3.5 flex flex-col items-center text-center"
                  onClick={() => void navigate(stat.path)}
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(17, 26, 58, 0.8), rgba(12, 18, 48, 0.6))",
                    border: "1px solid rgba(124,143,255,0.06)",
                  }}
                  whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
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
                </motion.button>
              );
            })}
          </motion.div>

          {/* Recent Activity Preview */}
          <div className="space-y-6 mb-8">
            {/* Submitted Preview */}
            {recentSubmitted.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-between mb-3">
                   <h3 className="text-[#e2e4f0] font-heading text-sm font-light">
                     Recently Submitted
                   </h3>
                  <button
                    onClick={() => void navigate('/profile/submitted')}
                    className="text-[#5a6080] hover:text-[#7c8fff] text-xs flex items-center gap-1 cursor-pointer"
                  >
                    View All
                    <ChevronDown size={10} className="transform -rotate-90" />
                  </button>
                </div>
                <div className="space-y-2">
                  {recentSubmitted.map((prayer) => (
                    <div
                      key={prayer.id}
                      className="rounded-xl px-3 py-2.5"
                      style={{
                        background: "rgba(17, 26, 58, 0.4)",
                        border: "1px solid rgba(124,143,255,0.05)",
                      }}
                    >
                      <p className="text-[#d0d4e8] text-sm line-clamp-2 mb-1">
                        &ldquo;{prayer.text}&rdquo;
                      </p>
                      <div className="flex items-center justify-between text-[#5a6080] text-xs">
                        <span>{prayer.city}</span>
                        <div className="flex items-center gap-1">
                          <Heart size={10} className="text-[#7c8fff] opacity-60" />
                          <span>{prayer.prayerCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Prayed For Preview */}
            {recentPrayed.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                <div className="flex items-center justify-between mb-3">
                   <h3 className="text-[#e2e4f0] font-heading text-sm font-light">
                     Recently Prayed For
                   </h3>
                  <button
                    onClick={() => void navigate('/profile/prayed')}
                    className="text-[#5a6080] hover:text-[#7c8fff] text-xs flex items-center gap-1 cursor-pointer"
                  >
                    View All
                    <ChevronDown size={10} className="transform -rotate-90" />
                  </button>
                </div>
                <div className="space-y-2">
                  {recentPrayed.map((prayer) => (
                    <div
                      key={prayer.id}
                      className="rounded-xl px-3 py-2.5"
                      style={{
                        background: "rgba(17, 26, 58, 0.4)",
                        border: "1px solid rgba(124,143,255,0.05)",
                      }}
                    >
                      <p className="text-[#d0d4e8] text-sm line-clamp-2 mb-1">
                        &ldquo;{prayer.text}&rdquo;
                      </p>
                      <div className="flex items-center justify-between text-[#5a6080] text-xs">
                        <span>{prayer.city}</span>
                        <div className="flex items-center gap-1">
                          <Heart size={10} className="text-[#7c8fff] opacity-60" />
                          <span>{prayer.prayerCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Empty States */}
            {recentSubmitted.length === 0 && recentPrayed.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 rounded-xl"
                style={{
                  background: "rgba(17, 26, 58, 0.4)",
                  border: "1px solid rgba(124,143,255,0.05)",
                }}
              >
                <Send size={20} className="text-[#4e5573] mx-auto mb-2" />
                <p className="text-[#6b7499] text-sm mb-1">No prayers yet</p>
                <p className="text-[#4e5573] text-xs mb-4">
                  Start by submitting a prayer or praying for others
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => void navigate('/submit')}
                    className="px-4 py-2 rounded-full text-xs text-[#7c8fff] bg-[rgba(124,143,255,0.08)] border border-[rgba(124,143,255,0.12)] cursor-pointer hover:bg-[rgba(124,143,255,0.12)] transition-all"
                  >
                    Submit Prayer
                  </button>
                  <button
                    onClick={() => void navigate('/feed')}
                    className="px-4 py-2 rounded-full text-xs text-[#a78bfa] bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.12)] cursor-pointer hover:bg-[rgba(167,139,250,0.12)] transition-all"
                  >
                    Browse Feed
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Settings / Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <button
              onClick={() => {
                ['oratio_profile','oratio_submitted','oratio_submitted_prayers','oratio_prayed'].forEach(k => localStorage.removeItem(k));
                void navigate("/splash");
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-colors hover:bg-[rgba(124,143,255,0.04)]"
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

        {/* Edit Display Name Drawer */}
        <Drawer.Root open={editOpen} onOpenChange={setEditOpen}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[600]" />
            <Drawer.Content
              className="fixed bottom-0 left-0 right-0 z-[600] bg-[#0A1A3A] rounded-t-2xl p-6 outline-none"
              style={{
                borderTop: "1px solid rgba(124,143,255,0.1)",
                boxShadow: "0 -20px 60px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div className="mx-auto w-12 h-1.5 bg-[rgba(124,143,255,0.2)] rounded-full mb-6" />
               <Drawer.Title className="sr-only">Edit Profile</Drawer.Title>
               <Drawer.Description className="sr-only">
                 Update your username and display name
               </Drawer.Description>
              
              <div className="max-w-md mx-auto">
                 <h3 className="text-[#e2e4f0] text-center mb-2 font-heading text-lg">
                   Edit Profile
                 </h3>
                 
                 <div className="mb-6">
                   <p className="text-[#8890b5] text-xs uppercase tracking-[0.15em] mb-2.5 text-center">
                     Username
                   </p>
                   <input
                     type="text"
                     value={newUsername}
                     onChange={(e) => { setNewUsername(e.target.value); setEditError(''); }}
                     onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()}
                     placeholder="username"
                     className={`w-full rounded-xl px-4 py-3.5 text-[#e2e4f0] placeholder-[#4e5573] text-sm focus:outline-none border transition-colors text-center ${editError ? 'border-[#ff6b6b]' : 'border-[rgba(124,143,255,0.12)] focus:border-[rgba(124,143,255,0.3)]'}`}
                     style={{ background: "rgba(15, 20, 50, 0.6)" }}
                   />
                 </div>
                 
                 <div className="mb-6">
                   <p className="text-[#8890b5] text-xs uppercase tracking-[0.15em] mb-2.5 text-center">
                     Display Name
                   </p>
                   <input
                     type="text"
                     value={newDisplayName}
                     onChange={(e) => { setNewDisplayName(e.target.value); setEditError(''); }}
                     onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()}
                     placeholder="Leave empty to use username"
                     className={`w-full rounded-xl px-4 py-3.5 text-[#e2e4f0] placeholder-[#4e5573] text-sm focus:outline-none border transition-colors text-center ${editError ? 'border-[#ff6b6b]' : 'border-[rgba(124,143,255,0.12)] focus:border-[rgba(124,143,255,0.3)]'}`}
                     style={{ background: "rgba(15, 20, 50, 0.6)" }}
                   />
                   {editError && (
                     <p className="text-[#ff6b6b] text-xs text-center mt-2">
                       {editError}
                     </p>
                   )}
                 </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditOpen(false)}
                    className="flex-1 py-3.5 rounded-full text-sm text-[#8b96c0] bg-[rgba(124,143,255,0.06)] border border-[rgba(124,143,255,0.1)] hover:bg-[rgba(124,143,255,0.12)] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                     onClick={handleSaveProfile}
                    className="flex-1 py-3.5 rounded-full text-sm text-white bg-[linear-gradient(135deg,#7c8fff,#5a6fd6)] hover:opacity-90 transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </div>
  );
}