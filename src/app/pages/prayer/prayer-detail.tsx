import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Check,
  Clock,
  MapPin,
  X,
  MoreHorizontal,
  Share2,
  Flag,
  Bookmark,
  MessageCircle,
  UserPlus,
  Pencil,
  Loader,
  Users,
  Lock,
} from 'lucide-react';
import { timeAgo, getAttributionText } from '../../services/prayer-data';
import type { PrayerRequest } from '../../services/prayer-data';
import { CommentSection } from '../../components/comments/comment-section';
import { reportContent } from '../../services/api';
import { renderHashtags } from '../../services/hashtags';
import { translateText, needsTranslation, detectLanguage } from '../../services/translate';
import { validatePrayerSubmission, sanitizePrayerText } from '../../../lib/validation';
import { AvatarImage } from '../../components/avatar-image';
import {
  getPrayerById,
  updatePrayerRequest,
  togglePray,
  toggleSavePrayer,
  getProfileByUsername,
  getPrayerCircleStatus,
  sendPrayerCircleInvite,
  cancelPrayerCircleInvite,
  respondToPrayerCircleInvite,
  toggleCommentsEnabled,
  getMyPrayedIds,
  getMySavedIds,
  type PrayerCircleStatus,
} from '../../services/supabase-queries';
import { LoadingSpinner, ErrorState } from '../../components/loading-spinner';
import { useAuth } from '../../hooks/auth-context';
import { logError } from '../../../lib/logger';
import { captureEvent } from '../../../lib/analytics';
import { getPrayerReportStatusTitle } from './report-status-title';

export function PrayerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [localPrayer, setLocalPrayer] = useState<PrayerRequest | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    const loadPrayer = async () => {
      setLoading(true);
      setError(null);

      try {
        const fetchedPrayer = await getPrayerById(id);
        if (active && fetchedPrayer) setLocalPrayer(fetchedPrayer);
      } catch {
        if (active) setError('Failed to load prayer');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPrayer();

    return () => {
      active = false;
    };
  }, [id]);

  const prayer = localPrayer;
  const [prayedIds, setPrayedIds] = useState<string[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPrayedIds = async () => {
      const ids = await getMyPrayedIds();
      if (active) setPrayedIds(ids);
    };

    void loadPrayedIds();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!prayer) return;
    let active = true;

    const loadSavedState = async () => {
      const ids = await getMySavedIds();
      if (active) setSaved(ids.includes(prayer.id));
    };

    void loadSavedState();

    return () => {
      active = false;
    };
  }, [prayer]);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const reportStatusTitle = getPrayerReportStatusTitle(reportNotice, reportError);
  const [circleStatus, setCircleStatus] = useState<PrayerCircleStatus>({ state: 'none' });
  const [circleBusy, setCircleBusy] = useState(false);
  const { profile: authProfile, user } = useAuth();
  const isAuthor = prayer
    ? prayer.authorId
      ? prayer.authorId === user?.id
      : prayer.username === authProfile?.username
    : false;
  const [showEdit, setShowEdit] = useState(false);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditPrayer = () => {
    if (!prayer) return;
    setEditText(prayer.text);
    setEditError('');
    setShowEdit(true);
  };

  const handleSavePrayerEdit = async () => {
    if (!prayer || savingEdit) return;

    const trimmed = editText.trim();
    const validation = validatePrayerSubmission({
      text: trimmed,
      location: '',
      category: prayer.category,
      anonymous: !prayer.username,
    });

    if (!validation.success) {
      setEditError(validation.errors?.text || 'Prayer update is not valid.');
      return;
    }

    const sanitizedText = sanitizePrayerText(trimmed);
    if (sanitizedText === prayer.text) {
      setShowEdit(false);
      return;
    }

    setSavingEdit(true);
    setEditError('');
    const updated = await updatePrayerRequest(prayer.id, sanitizedText);
    setSavingEdit(false);

    if (!updated) {
      setEditError("We couldn't save your update. Please try again.");
      return;
    }

    setLocalPrayer((prev) =>
      prev
        ? {
            ...prev,
            text: updated.text,
            editedAt: updated.editedAt,
          }
        : prev
    );
    setTranslatedText(null);
    setShowEdit(false);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('oratio-prayer-updated', {
          detail: {
            prayerId: prayer.id,
            text: updated.text,
            editedAt: updated.editedAt,
          },
        })
      );
    }
    captureEvent('prayer_edited', { prayerId: prayer.id });
  };

  const username = prayer?.username;
  const handleCircleInvite = async () => {
    if (!username || isAuthor) return;
    setCircleBusy(true);
    const prof = await getProfileByUsername(username);
    if (prof) {
      const ok = await sendPrayerCircleInvite(prof.id);
      if (ok) setCircleStatus(await getPrayerCircleStatus(prof.id));
    }
    setCircleBusy(false);
  };

  const handleCancelCircleInvite = async () => {
    if (!username || !circleStatus.inviteId) return;
    setCircleBusy(true);
    const ok = await cancelPrayerCircleInvite(circleStatus.inviteId);
    if (ok) setCircleStatus({ state: 'none' });
    setCircleBusy(false);
  };

  const handleAcceptCircleInvite = async () => {
    if (!circleStatus.inviteId) return;
    setCircleBusy(true);
    const ok = await respondToPrayerCircleInvite(circleStatus.inviteId, 'accepted');
    if (ok) setCircleStatus({ state: 'connected' });
    setCircleBusy(false);
  };

  useEffect(() => {
    if (!username || isAuthor) return;
    let active = true;

    const loadCircleState = async () => {
      const prof = await getProfileByUsername(username);
      if (!prof) return;
      const status = await getPrayerCircleStatus(prof.id);
      if (active) setCircleStatus(status);
    };

    void loadCircleState();

    return () => {
      active = false;
    };
  }, [isAuthor, username]);

  const handleTranslate = async () => {
    if (!prayer || translating) return;
    if (translatedText) {
      setTranslatedText(null);
      return;
    }
    setTranslating(true);
    const result = await translateText(prayer.text, userLang);
    if (result) setTranslatedText(result);
    setTranslating(false);
  };

  const userLang = navigator.language.split('-')[0] || 'en';
  const showTranslate = prayer ? needsTranslation(prayer.text, userLang) : false;
  const sourceLang = prayer && translatedText ? detectLanguage(prayer.text) : '';
  const langName: Record<string, string> = {
    es: 'Spanish',
    fr: 'French',
    pt: 'Portuguese',
    de: 'German',
    it: 'Italian',
    en: 'English',
  };

  const toggleSave = () => {
    const newSaved = !saved;
    setSaved(newSaved);
    void toggleSavePrayer(prayer!.id, newSaved);
    captureEvent(newSaved ? 'prayer_saved' : 'prayer_unsaved', { prayerId: prayer!.id });
  };

  const handleReport = async (reason: string) => {
    if (!prayer || reporting) return;
    setShowReport(false);
    setReporting(true);
    setReportNotice(null);
    setReportError(null);

    const result = await reportContent({
      reportable_type: 'prayer',
      reportable_id: prayer.id,
      reason,
    });
    setReporting(false);

    if (result.error) {
      logError('report prayer', 'report failed');
      setReportError("We couldn't send that report. Please try again.");
      return;
    }

    if (!result.alreadyReported) {
      captureEvent('prayer_reported', { prayerId: prayer.id, reason });
    }
    setReported(true);
    setReportNotice(
      result.alreadyReported
        ? "You've already reported this prayer. It's still saved for moderation."
        : "Thanks. Your report is saved for moderation, so you don't need to report this prayer again."
    );
  };

  const [commentsEnabled, setCommentsEnabled] = useState(true);

  useEffect(() => {
    const syncCommentsEnabled = () => {
      if (prayer) setCommentsEnabled(prayer.commentsEnabled ?? true);
    };

    syncCommentsEnabled();
  }, [prayer]);

  const handleToggleComments = () => {
    if (!prayer || prayer.audience !== 'public') return;
    const newVal = !commentsEnabled;
    setCommentsEnabled(newVal);
    void toggleCommentsEnabled(prayer.id, newVal);
  };

  const isPrayed = prayer ? prayedIds.includes(prayer.id) : false;
  const commentsAreAvailable =
    prayer?.audience === 'circle' || prayer?.audience === 'private' || commentsEnabled;
  const canToggleComments = isAuthor && prayer?.audience === 'public';

  const togglePrayed = useCallback((prayerId: string) => {
    setPrayedIds((prev) => {
      const isCurrentlyPrayed = prev.includes(prayerId);
      const newIds = isCurrentlyPrayed
        ? prev.filter((pid) => pid !== prayerId)
        : [...prev, prayerId];
      void togglePray(prayerId, !isCurrentlyPrayed);
      captureEvent(isCurrentlyPrayed ? 'prayer_unprayed' : 'prayer_prayed', { prayerId });
      return newIds;
    });
  }, []);

  const handleShare = async () => {
    if (!prayer) return;
    const url = `${window.location.origin}/prayer/${prayer.id}`;
    const attribution = getAttributionText(prayer);
    const c = prayer.prayerCount ?? 0;
    const shareText = `🙏 Prayer request${attribution ? ` from ${attribution}` : ''}:\n\n"${prayer.text}"\n\n${c} ${c === 1 ? 'person has' : 'people have'} prayed.\n${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch {
        /* ignore */
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
      } catch {
        /* ignore */
      }
    }
  };

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full w-full"
        style={{ background: 'rgb(var(--rgb-bg))' }}
      >
        <LoadingSpinner text="Loading prayer..." />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full w-full"
        style={{ background: 'rgb(var(--rgb-bg))' }}
      >
        <ErrorState
          message={error}
          onRetry={() => {
            setLoading(true);
            setError(null);
            if (id)
              getPrayerById(id)
                .then((p) => {
                  if (p) setLocalPrayer(p);
                  setLoading(false);
                })
                .catch(() => {
                  setError('Failed to load prayer');
                  setLoading(false);
                });
          }}
        />
        <button
          onClick={() => void navigate('/feed')}
          className="mt-2 px-5 py-2 rounded-full text-xs text-accent bg-accent/8 border border-accent/12 cursor-pointer"
        >
          Back to Feed
        </button>
      </div>
    );
  }

  if (!prayer) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full w-full"
        style={{ background: 'rgb(var(--rgb-bg))' }}
      >
        <p className="text-text-muted text-sm mb-4">Prayer not found</p>
        <button
          onClick={() => void navigate('/feed')}
          className="px-5 py-2 rounded-full text-xs text-accent bg-accent/8 border border-accent/12 cursor-pointer"
        >
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: 'rgb(var(--rgb-bg))' }}
    >
      {/* Header with back button + menu */}
      <div
        className="flex-shrink-0 pt-[max(1.5rem,env(safe-area-inset-top))] pb-2 px-4"
        style={{
          background:
            'linear-gradient(to bottom, rgba(var(--rgb-bg), 0.98), rgba(var(--rgb-bg), 0))',
        }}
      >
        <div className="flex items-center justify-between mt-12">
          <button
            onClick={() => void navigate(-1)}
            className="flex items-center gap-2 text-text-muted hover:text-text-muted transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span className="text-xs">Back</span>
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-text-dim hover:text-text-muted hover:bg-accent/6 transition-all cursor-pointer"
            >
              <MoreHorizontal size={16} />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-accent/10 overflow-hidden z-30"
                  style={{
                    background: 'rgba(var(--rgb-surface), 0.98)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  {prayer.audience !== 'circle' && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        void handleShare();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-text-secondary hover:bg-accent/8 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <Share2 size={12} />
                      Share
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      toggleSave();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-text-secondary hover:bg-accent/8 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Bookmark size={12} fill={saved ? '#c5cdff' : 'none'} />
                    {saved ? 'Saved' : 'Save'}
                  </button>
                  {showTranslate && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        void handleTranslate();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-text-secondary hover:bg-accent/8 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <span className="text-[10px]">🌐</span>
                      {translating ? 'Translating...' : translatedText ? 'Original' : 'Translate'}
                    </button>
                  )}
                  {isAuthor && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        openEditPrayer();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-text-secondary hover:bg-accent/8 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <Pencil size={12} />
                      Edit prayer
                    </button>
                  )}
                  {canToggleComments && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleToggleComments();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-text-secondary hover:bg-accent/8 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <MessageCircle size={12} />
                      {commentsEnabled ? 'Turn off comments' : 'Turn on comments'}
                    </button>
                  )}
                  {!reported ? (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowReport(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-text-secondary hover:bg-accent/8 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <Flag size={12} />
                      Report
                    </button>
                  ) : (
                    <div className="w-full px-4 py-2.5 text-xs text-text-dim flex items-center gap-2">
                      <Flag size={12} />
                      Report sent
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <div className="max-w-md mx-auto">
          {/* Location + time */}
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={12} className="text-text-dim" />
            <p className="text-text-muted text-xs uppercase tracking-[0.15em]">
              {prayer.city || 'Unknown'}, {prayer.country}
            </p>
          </div>
          {prayer.createdAt && (
            <p className="text-text-muted text-[11px] mb-5 flex items-center gap-2">
              {timeAgo(prayer.createdAt)}
              {prayer.audience === 'circle' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-accent/10 bg-accent/6 px-2 py-0.5 text-[10px] text-text-dim">
                  <Users size={10} />
                  Prayer Circle
                </span>
              )}
              {prayer.audience === 'private' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-accent/10 bg-accent/6 px-2 py-0.5 text-[10px] text-text-dim">
                  <Lock size={10} />
                  Private
                </span>
              )}
              {prayer.editedAt && (
                <span className="rounded-full border border-accent/10 bg-accent/6 px-2 py-0.5 text-[10px] text-text-dim">
                  Edited
                </span>
              )}
            </p>
          )}

          {/* Full prayer text */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-text font-heading mb-2"
            style={{ fontSize: '1.2rem', lineHeight: 1.8, fontWeight: 300 }}
          >
            {translatedText ||
              renderHashtags(prayer.text, (tag) => {
                void navigate(`/feed?search=${encodeURIComponent(tag)}`);
              })}
          </motion.p>
          {translatedText && sourceLang && (
            <p className="text-text-dim text-[10px] mb-6">
              Translated from {langName[sourceLang] || sourceLang}
            </p>
          )}

          {/* Attribution */}
          <div className="flex items-center gap-2.5 mb-4">
            <AvatarImage
              src={prayer.avatarUrl}
              name={username || getAttributionText(prayer)}
              alt={username || 'User'}
              className="h-6 w-6 flex-shrink-0 cursor-pointer text-[10px]"
              onClick={() => username && void navigate(`/user/${encodeURIComponent(username)}`)}
            />
            <button
              onClick={() => username && void navigate(`/user/${encodeURIComponent(username)}`)}
              className="text-text-muted text-sm hover:text-text-muted transition-colors cursor-pointer"
            >
              {getAttributionText(prayer)}
            </button>
            {username && !isAuthor && (
              <PrayerCircleMiniButton
                username={username}
                status={circleStatus}
                busy={circleBusy}
                onInvite={() => void handleCircleInvite()}
                onCancel={() => void handleCancelCircleInvite()}
                onAccept={() => void handleAcceptCircleInvite()}
              />
            )}
          </div>

          {/* Prayer count + comments indicator */}
          <div className="flex items-center gap-3 text-text-muted text-xs mb-8">
            {!commentsAreAvailable && (
              <span className="flex items-center gap-1 text-text-dim">
                <MessageCircle size={11} />
                <span>Comments off</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-text-muted text-xs mb-8">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                background: 'rgb(var(--rgb-accent))',
                boxShadow: '0 0 6px rgba(var(--rgb-accent), 0.5)',
              }}
            />
            <span>
              {(() => {
                const c = (prayer.prayerCount ?? 0) + (isPrayed ? 1 : 0);
                return `${c} ${c === 1 ? 'person prayed' : 'people prayed'}`;
              })()}
            </span>
          </div>

          {/* Pray button */}
          <div className="flex justify-center mb-4">
            <motion.button
              onClick={() => togglePrayed(prayer.id)}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2.5 px-8 py-3 rounded-full text-sm transition-all duration-500 cursor-pointer"
              style={{
                background: isPrayed
                  ? 'rgba(var(--rgb-accent), 0.12)'
                  : 'linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))',
                color: isPrayed ? 'rgb(var(--rgb-accent))' : 'rgb(var(--rgb-text))',
                boxShadow: isPrayed
                  ? 'none'
                  : '0 4px 24px rgba(var(--rgb-accent), 0.25), 0 0 0 1px rgba(var(--rgb-accent), 0.1)',
              }}
            >
              <span className="text-base">🙏</span>
              {isPrayed ? 'Prayed for this' : 'Pray for this'}
            </motion.button>
          </div>

          {(reportNotice || reportError) && (
            <div className="flex justify-center mb-8">
              <div
                className={`max-w-sm rounded-xl px-4 py-3 text-center border ${
                  reportError ? 'border-danger/20 bg-danger/8' : 'border-warning/20 bg-warning/8'
                }`}
              >
                <p
                  className={`text-xs font-medium mb-1 ${
                    reportError ? 'text-danger' : 'text-warning'
                  }`}
                >
                  {reportStatusTitle}
                </p>
                <p className="text-text-dim text-[11px] leading-relaxed">
                  {reportError || reportNotice}
                </p>
              </div>
            </div>
          )}

          {/* Comments section */}
          <div className="border-t border-accent/8 pt-4">
            {commentsAreAvailable ? (
              <CommentSection
                prayer={prayer}
                commentCount={commentCount}
                onCommentCountChange={setCommentCount}
              />
            ) : (
              <div className="text-center py-6">
                <MessageCircle size={20} className="text-text-dim mx-auto mb-2" />
                <p className="text-text-muted text-xs">Comments are disabled for this prayer</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report dialog */}
      {createPortal(
        <AnimatePresence>
          {showEdit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
              style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowEdit(false)}
            >
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                className="w-full max-w-md rounded-t-2xl p-5 sm:rounded-2xl border border-accent/10"
                style={{ background: 'rgba(var(--rgb-surface), 0.98)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-text-secondary text-sm">Edit prayer</p>
                  <button
                    onClick={() => setShowEdit(false)}
                    className="h-9 w-9 rounded-full flex items-center justify-center text-text-faint hover:text-text-muted hover:bg-accent/8 transition-colors cursor-pointer"
                    aria-label="Close edit prayer"
                  >
                    <X size={16} />
                  </button>
                </div>
                <textarea
                  value={editText}
                  onChange={(e) => {
                    setEditText(e.target.value);
                    setEditError('');
                  }}
                  rows={6}
                  maxLength={500}
                  className="w-full rounded-xl px-4 py-3 text-text placeholder-text-dim text-sm focus:outline-none border border-accent/12 resize-none"
                  style={{
                    background: 'rgba(var(--rgb-bg), 0.35)',
                    lineHeight: 1.7,
                  }}
                />
                <div className="mt-2 flex items-center gap-3">
                  {editError ? (
                    <p className="text-danger text-xs flex-1">{editError}</p>
                  ) : (
                    <p className="text-text-dim text-xs flex-1">Update wording for clarity.</p>
                  )}
                  <p
                    className={`text-xs ${editText.length > 500 || editText.trim().length < 10 ? 'text-danger' : 'text-text-dim'}`}
                  >
                    {editText.length}/500
                  </p>
                </div>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => setShowEdit(false)}
                    className="flex-1 rounded-full border border-accent/12 px-4 py-3 text-sm text-text-muted transition-colors hover:bg-accent/6 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleSavePrayerEdit()}
                    disabled={savingEdit}
                    className="flex-1 rounded-full px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                    style={{
                      background:
                        'linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))',
                      color: 'rgb(var(--rgb-text))',
                    }}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {savingEdit && <Loader size={14} className="animate-spin" />}
                      {savingEdit ? 'Saving...' : 'Save update'}
                    </span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
          {showReport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowReport(false)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                className="w-full max-w-sm rounded-2xl p-5 border border-accent/10"
                style={{ background: 'rgba(var(--rgb-surface), 0.98)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-text-secondary text-sm">Why are you reporting this?</p>
                  <button
                    onClick={() => setShowReport(false)}
                    className="text-text-faint hover:text-text-muted transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    'Spam or fake',
                    'Upsetting or graphic',
                    'Harmful or unsafe',
                    'Something else',
                  ].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => void handleReport(reason)}
                      disabled={reporting}
                      className="w-full text-left px-4 py-3 rounded-xl text-xs text-text-muted hover:text-text-secondary hover:bg-accent/8 border border-accent/6 transition-all cursor-pointer"
                    >
                      {reason}
                    </button>
                  ))}
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

function PrayerCircleMiniButton({
  username,
  status,
  busy,
  onInvite,
  onCancel,
  onAccept,
}: {
  username: string;
  status: PrayerCircleStatus;
  busy: boolean;
  onInvite: () => void;
  onCancel: () => void;
  onAccept: () => void;
}) {
  if (status.state === 'connected') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full text-accent bg-accent/10 border border-accent/15">
        <Check size={11} />
        In Prayer Circle
      </span>
    );
  }

  if (status.state === 'pending_sent') {
    return (
      <button
        onClick={onCancel}
        disabled={busy}
        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all cursor-pointer disabled:opacity-60"
        style={{
          background: 'rgba(var(--rgb-accent), 0.08)',
          border: '1px solid rgba(var(--rgb-accent), 0.16)',
          color: 'rgb(var(--rgb-accent))',
        }}
        aria-label={`Cancel Prayer Circle invite to @${username}`}
      >
        <Clock size={11} />
        Invite sent
      </button>
    );
  }

  if (status.state === 'pending_received') {
    return (
      <button
        onClick={onAccept}
        disabled={busy}
        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all cursor-pointer disabled:opacity-60"
        style={{
          background:
            'linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))',
          color: 'rgb(var(--rgb-text))',
        }}
      >
        <Check size={11} />
        Accept invite
      </button>
    );
  }

  return (
    <button
      onClick={onInvite}
      disabled={busy}
      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all cursor-pointer disabled:opacity-60"
      style={{
        background: 'rgba(var(--rgb-accent), 0.04)',
        border: '1px solid rgba(var(--rgb-accent), 0.08)',
        color: 'rgb(var(--rgb-text-dim))',
      }}
    >
      <UserPlus size={11} />
      Invite @{username}
    </button>
  );
}
