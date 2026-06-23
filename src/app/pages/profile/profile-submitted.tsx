import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, MapPin } from "lucide-react";
import { Drawer } from "vaul";
import { useNavigate } from "react-router";
import { timeAgo, getAttributionText } from '../../services/prayer-data';
import type { PrayerRequest } from '../../services/prayer-data';
import { PrayerRow } from "../../components/feed/prayer-row";
import { getMyPrayers, deletePrayerRequest } from '../../services/supabase-queries';
import { LoadingSpinner } from "../../components/loading-spinner";

export function ProfileSubmitted() {
  const navigate = useNavigate();
  
  // Prayer detail / action drawer
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  // Delete confirmation
  const [prayerToDelete, setPrayerToDelete] = useState<PrayerRequest | null>(null);
  
  const [mySubmitted, setMySubmitted] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyPrayers().then((prayers) => {
      setMySubmitted(prayers);
      setLoading(false);
    });
  }, []);

  const handleOpenPrayer = (prayer: PrayerRequest) => {
    void navigate(`/prayer/${prayer.id}`);
  };

  const performDeletePrayer = (prayerId: string) => {
    void deletePrayerRequest(prayerId);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("oratio-prayer-removed", { detail: prayerId }));
    }

    setMySubmitted(prev => prev.filter(p => p.id !== prayerId));
  };

  const handleTagClick = (tag: string) => {
    const q = tag.startsWith("#") ? tag : `#${tag}`;
    void navigate(`/feed?search=${encodeURIComponent(q)}`);
  };

  const handleDeleteClick = (prayerId: string) => {
    const prayer = mySubmitted.find(p => p.id === prayerId);
    if (prayer) {
      // Close any open prayer detail drawer
      setSelectedPrayer(null);
      // Open delete confirmation drawer
      setPrayerToDelete(prayer);
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ background: "rgb(var(--rgb-bg))" }}
    >
      {/* Scrollable content */}
      <div className="flex-1 px-4 pb-28 overflow-y-auto pt-24">
        {loading ? (
          <LoadingSpinner text="Loading your prayers..." />
        ) : mySubmitted.length > 0 ? (
          <div className="space-y-2.5">
            {mySubmitted.map((prayer, i) => (
              <PrayerRow
                key={prayer.id}
                prayer={prayer}
                index={i}
                showCount={true}
                canManage={true}
                onTap={handleOpenPrayer}
                onTagClick={handleTagClick}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 rounded-xl mt-8"
            style={{
              background: "rgba(var(--rgb-surface), 0.4)",
              border: "1px solid rgba(var(--rgb-accent), 0.05)",
            }}
          >
            <Send size={20} className="text-text-dim mx-auto mb-2" />
            <p className="text-text-muted text-sm mb-1">No prayers yet</p>
            <p className="text-text-dim text-xs">
              Submit your first prayer request
            </p>
            <button
              onClick={() => void navigate('/submit')}
              className="mt-3 px-4 py-2 rounded-full text-xs text-accent bg-accent/8 border border-accent/12 cursor-pointer hover:bg-accent/12 transition-all"
            >
              Submit Prayer
            </button>
          </motion.div>
        )}
      </div>

      {/* Prayer Action Drawer */}
      <Drawer.Root
        open={!!selectedPrayer}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedPrayer(null);
          }
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[600]" />
          <Drawer.Content
            className="flex flex-col rounded-t-[1.5rem] fixed bottom-0 left-0 right-0 z-[600] max-h-[85vh] focus:outline-none"
            style={{
              background: "linear-gradient(180deg, rgb(var(--rgb-surface)), rgb(var(--rgb-surface)))",
              borderTop: "1px solid rgba(var(--rgb-accent), 0.1)",
            }}
          >
            <Drawer.Title className="sr-only">Prayer Options</Drawer.Title>
            <Drawer.Description className="sr-only">
              Manage your prayer request
            </Drawer.Description>

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-accent/20" />
            </div>

            <div className="max-w-md w-full mx-auto p-6 pt-2 flex-1 overflow-auto">
              {selectedPrayer && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key="options"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Prayer preview */}
                    <div className="flex items-center gap-2 mb-1 justify-center">
                      <MapPin size={12} className="text-text-dim" />
                      <p className="text-text-muted text-xs">
                        {(selectedPrayer.city || "Unknown")}, {selectedPrayer.country}
                      </p>
                    </div>
                    {selectedPrayer.createdAt && (
                      <p className="text-text-muted text-[11px] mb-5 text-center">
                        {timeAgo(selectedPrayer.createdAt)}
                      </p>
                    )}

                    <p
                      className="text-text-secondary text-center mb-3 max-w-xs mx-auto"
                      style={{ fontSize: "0.95rem", lineHeight: 1.7 }}
                    >
                      {selectedPrayer.text}
                    </p>

                      <p className="text-text-dim text-xs text-center mb-2">
                        {getAttributionText(selectedPrayer)}
                      </p>

                    <div className="flex items-center gap-1.5 justify-center text-text-dim text-xs mb-8">
                      <span className="text-xs opacity-60">🙏</span>
                      <span>{(selectedPrayer.prayerCount ?? 0)} {(selectedPrayer.prayerCount ?? 0) === 1 ? "person" : "people"} prayed</span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Delete Confirmation Drawer */}
      <Drawer.Root
        open={!!prayerToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setPrayerToDelete(null);
          }
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[700]" />
          <Drawer.Content
            className="flex flex-col rounded-t-[1.5rem] fixed bottom-0 left-0 right-0 z-[700] max-h-[60vh] focus:outline-none"
            style={{
              background: "linear-gradient(180deg, rgb(var(--rgb-surface)), rgb(var(--rgb-surface)))",
              borderTop: "1px solid rgba(var(--rgb-accent), 0.1)",
            }}
          >
            <Drawer.Title className="sr-only">Delete Confirmation</Drawer.Title>
            <Drawer.Description className="sr-only">
              Confirm deletion of prayer request
            </Drawer.Description>

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-accent/20" />
            </div>

            <div className="max-w-md w-full mx-auto p-6 pt-2 flex-1 overflow-auto">
              {prayerToDelete && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key="delete-confirmation"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-center mb-6">
                      <p className="text-text-secondary text-lg mb-2">Delete prayer?</p>
                      <p className="text-text-muted text-sm">
                        This prayer will be removed from your submitted prayers and the global feed.
                      </p>
                      <p className="text-text-muted text-sm mt-2">
                        {prayerToDelete.text.slice(0, 100)}...
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                       <button
                        type="button"
                        autoFocus
                        onClick={() => {
                          if (prayerToDelete) {
                            performDeletePrayer(prayerToDelete.id);
                            setPrayerToDelete(null);
                          }
                        }}
                        className="w-full py-3.5 rounded-full text-sm font-medium cursor-pointer"
                        style={{
                          background: "linear-gradient(135deg, rgb(var(--rgb-danger)), #d65a5a)",
                          color: "rgb(var(--rgb-text))",
                          boxShadow: "0 4px 25px rgba(var(--rgb-danger), 0.3)",
                        }}
                      >
                        Delete Prayer
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrayerToDelete(null)}
                        className="w-full py-3.5 rounded-full text-sm text-accent border border-accent/25 hover:border-accent/50 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}

