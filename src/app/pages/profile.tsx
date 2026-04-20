import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  Send,
  MapPin,
  ChevronRight,
  LogOut,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { Drawer } from "vaul";
import { useNavigate } from "react-router";
import { timeAgo } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import {
  getProfile,
  getSubmittedIds,
  getPrayedIds,
  getStoredSubmittedPrayers,
  getPrayedForPrayers,
  categoryColors,
} from "../data/profile-data";




export function Profile() {
  const navigate = useNavigate();
  const [profile] = useState(getProfile);
  const [activeTab, setActiveTab] = useState<'submitted' | 'prayed'>('submitted');
  const [submittedVersion, setSubmittedVersion] = useState(0);
  const [prayedVersion, setPrayedVersion] = useState(0);



  // Prayer detail / action drawer
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  const [actionView, setActionView] = useState<"options">("options");




  // Track removed/answered ids locally for instant UI updates



  const submittedIds = getSubmittedIds();
  const prayedIds = getPrayedIds();

  const mySubmitted = useMemo(() => {
    const storedPrayers = getStoredSubmittedPrayers()
      .map((p) => ({ ...p, prayerCount: 0 }));
    return storedPrayers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedIds, submittedVersion]);

  const myPrayed = useMemo(() => {
    return getPrayedForPrayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prayedIds, prayedVersion]);







   const handleOpenPrayer = (prayer: PrayerRequest) => {
     setSelectedPrayer(prayer);
     setActionView("options");
   };

    const handleDeletePrayer = (prayerId: string) => {
      try {
        // Remove from submitted prayers list
        const submitted = JSON.parse(localStorage.getItem("oratio_submitted") || "[]") as string[];
        localStorage.setItem("oratio_submitted", JSON.stringify(submitted.filter(id => id !== prayerId)));
        
        // Remove from submitted prayers storage
        const storedPrayers = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]") as PrayerRequest[];
        localStorage.setItem("oratio_submitted_prayers", JSON.stringify(storedPrayers.filter(p => p.id !== prayerId)));
        
        // Remove from prayed IDs if present
        const prayed = JSON.parse(localStorage.getItem("oratio_prayed") || "[]") as string[];
        localStorage.setItem("oratio_prayed", JSON.stringify(prayed.filter(id => id !== prayerId)));
        
        // Force re-render of submitted list
        setSubmittedVersion(v => v + 1);
      } catch (error) {
        console.error("Failed to delete prayer:", error);
      }
    };

    const togglePrayed = (id: string) => {
      try {
        const prayedIds = JSON.parse(localStorage.getItem("oratio_prayed") || "[]") as string[];
        const isCurrentlyPrayed = prayedIds.includes(id);
        const newPrayed = !isCurrentlyPrayed;

        // Update prayed IDs in localStorage
        if (newPrayed && !prayedIds.includes(id)) {
          localStorage.setItem("oratio_prayed", JSON.stringify([...prayedIds, id]));
        } else if (!newPrayed && prayedIds.includes(id)) {
          localStorage.setItem("oratio_prayed", JSON.stringify(prayedIds.filter(pId => pId !== id)));
        }

        // Update prayer count in submitted prayers storage
        const submittedPrayers = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]") as PrayerRequest[];
        const updated = submittedPrayers.map(p => 
          p.id === id ? { ...p, prayerCount: p.prayerCount + (newPrayed ? 1 : -1) } : p
        );
        localStorage.setItem("oratio_submitted_prayers", JSON.stringify(updated));

        // Force re-render of prayed list
        setPrayedVersion(v => v + 1);
      } catch (error) {
        console.error("Failed to toggle prayed:", error);
      }
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
             className="grid grid-cols-2 gap-2 mb-8"
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
             ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                 <motion.button
                   key={stat.label}
                   initial={{ opacity: 0, y: 16 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.15 + i * 0.06, duration: 0.4 }}
                   className="rounded-xl p-3.5 flex flex-col items-center text-center"
                   onClick={() => setActiveTab(stat.label === 'Submitted' ? 'submitted' : 'prayed')}
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



          {/* Tab toggle: My Prayers / Prayed For */}
          {/* Recent Activity Preview */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mb-8"
          >
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#e2e4f0] font-heading" style={{ fontSize: "1.35rem", fontWeight: 300 }}>My Prayers</h3>
             </div>
             
             {/* Tab toggle */}
             <div className="flex gap-1 mb-4">
               <button
                 onClick={() => setActiveTab('submitted')}
                 className="flex-1 py-2 rounded-lg text-xs transition-all duration-300 cursor-pointer"
                 style={{
                   background: activeTab === 'submitted' 
                     ? 'rgba(124,143,255,0.12)' 
                     : 'transparent',
                   color: activeTab === 'submitted' ? '#7c8fff' : '#6b7499',
                   border: activeTab === 'submitted'
                     ? '1px solid rgba(124,143,255,0.2)'
                     : '1px solid transparent',
                 }}
               >
                 Submitted
               </button>
               <button
                 onClick={() => setActiveTab('prayed')}
                 className="flex-1 py-2 rounded-lg text-xs transition-all duration-300 cursor-pointer"
                 style={{
                   background: activeTab === 'prayed' 
                     ? 'rgba(124,143,255,0.12)' 
                     : 'transparent',
                   color: activeTab === 'prayed' ? '#7c8fff' : '#6b7499',
                   border: activeTab === 'prayed'
                     ? '1px solid rgba(124,143,255,0.2)'
                     : '1px solid transparent',
                 }}
               >
                 Prayed For
               </button>
             </div>

             {(activeTab === 'submitted' ? mySubmitted : myPrayed).length > 0 ? (
               <div className="space-y-2.5">
                 {(activeTab === 'submitted' ? mySubmitted : myPrayed).map((prayer, i) => (
                     <PrayerRow
                       key={prayer.id}
                       prayer={prayer}
                       index={i}
                       showCount={true}
                       canManage={activeTab === 'submitted'}
                       onTap={handleOpenPrayer}
                       onDelete={activeTab === 'submitted' ? handleDeletePrayer : undefined}
                       hasPrayed={prayedIds.includes(prayer.id)}
                       onTogglePrayed={togglePrayed}
                       showPrayedToggle={activeTab === 'prayed'}
                     />
                 ))}
               </div>
             ) : (
               <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="text-center py-8 rounded-xl"
                 style={{
                   background: "rgba(17, 26, 58, 0.4)",
                   border: "1px solid rgba(124,143,255,0.05)",
                 }}
               >
                 {activeTab === 'submitted' ? (
                   <>
                     <Send size={20} className="text-[#4e5573] mx-auto mb-2" />
                     <p className="text-[#6b7499] text-sm mb-1">No prayers yet</p>
                     <p className="text-[#4e5573] text-xs">
                       Submit your first prayer request
                     </p>
                     <button
                        onClick={() => void navigate('/submit')}
                       className="mt-3 px-4 py-2 rounded-full text-xs text-[#7c8fff] bg-[rgba(124,143,255,0.08)] border border-[rgba(124,143,255,0.12)] cursor-pointer hover:bg-[rgba(124,143,255,0.12)] transition-all"
                     >
                       Submit Prayer
                     </button>
                   </>
                 ) : (
                   <>
                     <Heart size={20} className="text-[#4e5573] mx-auto mb-2" />
                     <p className="text-[#6b7499] text-sm mb-1">No prayers yet</p>
                     <p className="text-[#4e5573] text-xs">
                       Pray for someone to see them here
                     </p>
                     <button
                        onClick={() => void navigate('/feed')}
                       className="mt-3 px-4 py-2 rounded-full text-xs text-[#7c8fff] bg-[rgba(124,143,255,0.08)] border border-[rgba(124,143,255,0.12)] cursor-pointer hover:bg-[rgba(124,143,255,0.12)] transition-all"
                     >
                       Browse Feed
                     </button>
                   </>
                 )}
               </motion.div>
             )}
          </motion.div>

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
               onClick={() => void navigate("/submit")}
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
               onClick={() => void navigate("/feed")}
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
                ['oratio_profile','oratio_submitted','oratio_submitted_prayers','oratio_prayed'].forEach(k => localStorage.removeItem(k));
                sessionStorage.removeItem('oratio_visited');
                 void navigate("/splash");
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
export function PrayerRow({
  prayer,
  index,
  showCount,
  canManage,
  onTap,
  onDelete,
  hasPrayed = false,
  onTogglePrayed,
  showPrayedToggle = false,
}: {
  prayer: PrayerRequest;
  index: number;
  showCount: boolean;
  canManage: boolean;
  onTap: (prayer: PrayerRequest) => void;
  onDelete?: (prayerId: string) => void;
  hasPrayed?: boolean;
  onTogglePrayed?: (id: string) => void;
  showPrayedToggle?: boolean;
}) {
  const catColor =
    categoryColors[prayer.category || "Other"] || "#8890b5";

  const [prayed, setPrayed] = useState(hasPrayed);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrayed(hasPrayed);
  }, [hasPrayed, prayer.id]);

  const handlePray = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPrayed = !prayed;
    setPrayed(newPrayed);
    if (onTogglePrayed) {
      onTogglePrayed(prayer.id);
    }
  };

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

          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
            {showCount && (
              <div className="flex items-center gap-1">
                <Heart size={11} className="text-[#7c8fff] opacity-60" />
                <span className="text-[#6b7499] text-[11px]">
                  {prayer.prayerCount}
                </span>
              </div>
            )}
            {showPrayedToggle && onTogglePrayed && (
              <button
                onClick={handlePray}
                className="flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-300 cursor-pointer"
                style={{
                  background: prayed
                    ? "rgba(124, 143, 255, 0.1)"
                    : "rgba(124, 143, 255, 0.06)",
                  border: `1px solid ${
                    prayed ? "rgba(124, 143, 255, 0.2)" : "rgba(124, 143, 255, 0.1)"
                  }`,
                }}
                title={prayed ? "Unpray" : "Pray"}
              >
                <Heart
                  size={11}
                  className="transition-all duration-300"
                  fill={prayed ? "#7c8fff" : "transparent"}
                  color={prayed ? "#7c8fff" : "#6b7499"}
                />
              </button>
            )}
            {canManage && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(prayer.id);
                }}
                className="text-[#5a6080] hover:text-[#8890b5] cursor-pointer"
                title="Delete prayer"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
      </div>
    </motion.div>
  );
}