import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Send, Users } from "lucide-react";
import { Drawer } from "vaul";
import { useNavigate, useSearchParams } from "react-router";
import type { PrayerRequest } from '../../services/prayer-data';
import { PrayerRow } from "../../components/feed/prayer-row";
import { getMyPrayers, deletePrayerRequest } from '../../services/supabase-queries';
import { LoadingSpinner } from "../../components/loading-spinner";

type PrayerLibraryView = 'public' | 'circle' | 'private';

function getPrayerLibraryView(searchParams: URLSearchParams): PrayerLibraryView {
  const view = searchParams.get('view');
  if (view === 'circle' || view === 'private') return view;
  return 'public';
}

function getViewCopy(view: PrayerLibraryView) {
  if (view === 'private') {
    return {
      title: 'Private prayers',
      description: 'Only you can see these. Open one to add private notes whenever you need.',
      emptyTitle: 'No private prayers yet',
      emptyDescription: 'Use Private when a prayer is just for you.',
      Icon: Lock,
    };
  }

  if (view === 'circle') {
    return {
      title: 'Prayer Circle prayers',
      description: 'Prayers you shared with accepted people in your Prayer Circle.',
      emptyTitle: 'No Prayer Circle prayers yet',
      emptyDescription: 'Prayer Circle prayers will appear here after you share with your circle.',
      Icon: Users,
    };
  }

  return {
    title: 'Public prayers',
    description: 'Prayers you shared with the wider Oratio community.',
    emptyTitle: 'No public prayers yet',
    emptyDescription: 'Public prayers will appear here after you share with everyone.',
    Icon: Send,
  };
}

export function ProfileSubmitted() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Delete confirmation
  const [prayerToDelete, setPrayerToDelete] = useState<PrayerRequest | null>(null);
  
  const [mySubmitted, setMySubmitted] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const activeView = getPrayerLibraryView(searchParams);
  const viewCopy = getViewCopy(activeView);
  const Icon = viewCopy.Icon;
  const visiblePrayers = mySubmitted.filter((prayer) => {
    const audience = prayer.audience || 'public';
    return audience === activeView;
  });

  useEffect(() => {
    let active = true;

    const loadSubmitted = async () => {
      setLoading(true);
      try {
        const prayers = await getMyPrayers();
        if (active) setMySubmitted(prayers);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadSubmitted();

    return () => {
      active = false;
    };
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
        ) : (
          <div className="space-y-4">
            <div
              className="rounded-xl px-4 py-3.5"
              style={{
                background:
                  "linear-gradient(160deg, rgba(var(--rgb-accent), 0.08), rgba(var(--rgb-surface), 0.35))",
                border: "1px solid rgba(var(--rgb-accent), 0.08)",
              }}
            >
              <div className="flex gap-3">
                <Icon size={16} className="text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-text text-sm font-medium">{viewCopy.title}</p>
                  <p className="text-text-dim text-xs mt-0.5 leading-relaxed">
                    {viewCopy.description}
                  </p>
                </div>
              </div>
            </div>

            {visiblePrayers.length > 0 ? (
              <div className="space-y-2.5">
                {visiblePrayers.map((prayer, i) => (
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
                className="text-center py-8 rounded-xl"
                style={{
                  background: "rgba(var(--rgb-surface), 0.4)",
                  border: "1px solid rgba(var(--rgb-accent), 0.05)",
                }}
              >
                <Icon size={20} className="text-text-dim mx-auto mb-2" />
                <p className="text-text-muted text-sm mb-1">{viewCopy.emptyTitle}</p>
                <p className="text-text-dim text-xs mb-3">{viewCopy.emptyDescription}</p>
                <button
                  onClick={() => void navigate('/submit')}
                  className="px-4 py-2 rounded-full text-xs text-accent bg-accent/8 border border-accent/12 cursor-pointer hover:bg-accent/12 transition-all"
                >
                  Submit Prayer
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>

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
                        {prayerToDelete.audience === 'private'
                          ? 'This private prayer and any notes will be removed.'
                          : prayerToDelete.audience === 'circle'
                            ? 'This prayer will be removed from your submitted prayers and Prayer Circle.'
                            : 'This prayer will be removed from your submitted prayers and the global feed.'}
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
