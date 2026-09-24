import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, EyeOff, Loader, RotateCcw, X } from 'lucide-react';
import { getReportReview, moderateReport } from '../../services/supabase-queries';
import type { ModerationAction, ReportRecord, ReportReview } from '../../services/supabase-queries';
import { timeAgo } from '../../services/prayer-data';

const labels: Record<ModerationAction, string> = {
  hide: 'Hide content',
  dismiss: 'Dismiss report',
  restore: 'Restore content',
};
const buttonClass =
  'min-h-11 inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-40';

export function ReportReviewPanel({
  report,
  onDecision,
  onSavingChange,
}: {
  report: ReportRecord;
  onDecision: (action: ModerationAction) => void;
  onSavingChange: (saving: boolean) => void;
}) {
  const [review, setReview] = useState<ReportReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState<ModerationAction | null>(null);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);
  const saveLock = useRef(false);
  const cancelButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) cancelButton.current?.focus();
  }, [confirming]);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError(null);
    setReview(null);
    setConfirming(null);
    try {
      const data = await getReportReview(report.id);
      if (request === requestId.current) setReview(data);
    } catch (cause) {
      if (request === requestId.current)
        setError(cause instanceof Error ? cause.message : 'The review could not be loaded.');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [report.id]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const submit = async () => {
    if (!review || !confirming || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    onSavingChange(true);
    const request = requestId.current;
    try {
      await moderateReport(report.id, confirming, note, review.version);
      if (request === requestId.current) onDecision(confirming);
    } catch (cause) {
      if (request === requestId.current) {
        setError(cause instanceof Error ? cause.message : 'The decision could not be saved.');
        // An interrupted response may already have committed. Reload before retrying.
        setReview(null);
        setConfirming(null);
      }
    } finally {
      saveLock.current = false;
      if (request === requestId.current) {
        setSaving(false);
        onSavingChange(false);
      }
    }
  };

  const validNote = note.trim().length >= 3 && note.trim().length <= 1000;
  const canDecide = review && (review.status === 'pending' || (review.available && review.hidden));

  return (
    <article>
      <header className="border-b border-border pb-4 mb-5">
        <p className="text-xs text-text-muted capitalize">
          {report.reportable_type} report · {timeAgo(report.created_at)}
        </p>
        <h2 className="text-lg mt-2 break-words [overflow-wrap:anywhere]">{report.reason}</h2>
        {report.reporter_details && (
          <section aria-label="Reporter details" className="mt-4">
            <h3 className="text-sm text-text-muted">Reporter details</h3>
            <p className="text-sm mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {report.reporter_details}
            </p>
          </section>
        )}
      </header>
      {loading && (
        <p role="status" className="flex gap-2 py-8">
          <Loader size={18} className="animate-spin" />
          Loading review
        </p>
      )}
      {error && (
        <div role="alert" className="py-4">
          <p>{error}</p>
          <button onClick={() => void load()} className="min-h-11 text-accent">
            Reload review
          </button>
        </div>
      )}
      {review && (
        <>
          {!review.available ? (
            <p className="text-text-muted py-4">
              Content is no longer available for review. It may have been deleted or made private.
            </p>
          ) : (
            <section aria-label="Reported content" className="space-y-3 pb-6">
              <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                <span>{review.target?.author}</span>
                <span className="capitalize">{review.prayer?.audience}</span>
                <span>{review.hidden ? 'Hidden by moderation' : 'Not hidden by moderation'}</span>
              </div>
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-base leading-relaxed">
                {review.target?.body}
              </p>
              {review.parent_comment && (
                <div className="border-l-2 border-border pl-4">
                  <h3 className="text-sm text-text-muted">In reply to</h3>
                  <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] mt-2">
                    {review.parent_comment}
                  </p>
                </div>
              )}
              {report.reportable_type === 'comment' && (
                <details className="border-l-2 border-border pl-4">
                  <summary className="cursor-pointer text-sm py-2">Parent prayer</summary>
                  <p className="text-sm text-text-muted whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                    {review.prayer?.body}
                  </p>
                </details>
              )}
            </section>
          )}
          {canDecide && (
            <section aria-label="Decision" className="border-t border-border pt-5">
              <label htmlFor="moderation-note" className="block text-sm mb-2">
                Decision reason (moderators only)
              </label>
              <textarea
                id="moderation-note"
                rows={4}
                maxLength={1000}
                value={note}
                disabled={saving || !!confirming}
                className="w-full resize-y min-h-28 rounded-lg border border-border bg-surface text-text-primary p-3 text-sm focus:outline-accent"
                onChange={(event) => setNote(event.target.value)}
              />
              <p className="text-xs text-text-muted text-right mt-1">{note.length}/1000</p>
              {confirming ? (
                <div className="border-l-2 border-warning pl-4 mt-4" aria-label="Confirm decision">
                  <h3 className="font-medium">{labels[confirming]}?</h3>
                  <p className="text-sm text-text-muted mt-2">
                    {confirming === 'hide'
                      ? 'This hides the content from the app and resolves related pending reports.'
                      : confirming === 'restore'
                        ? 'The moderation restriction will be removed. The original audience still applies.'
                        : 'This closes the report without changing content visibility.'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      ref={cancelButton}
                      className={buttonClass}
                      disabled={saving}
                      onClick={() => setConfirming(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className={`${buttonClass} bg-accent text-white border-transparent`}
                      disabled={saving}
                      onClick={() => void submit()}
                    >
                      {saving && <Loader size={16} className="animate-spin" />}
                      {saving ? 'Saving decision' : `Confirm ${confirming}`}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mt-3">
                  {review.status === 'pending' && (
                    <button
                      className={buttonClass}
                      disabled={!validNote}
                      onClick={() => setConfirming('dismiss')}
                    >
                      <X size={16} />
                      Dismiss report
                    </button>
                  )}
                  {review.available && !review.hidden && review.status === 'pending' && (
                    <button
                      className={`${buttonClass} text-danger`}
                      disabled={!validNote}
                      onClick={() => setConfirming('hide')}
                    >
                      <EyeOff size={16} />
                      Hide content
                    </button>
                  )}
                  {review.available && review.hidden && (
                    <button
                      className={buttonClass}
                      disabled={!validNote}
                      onClick={() => setConfirming('restore')}
                    >
                      <RotateCcw size={16} />
                      Restore content
                    </button>
                  )}
                </div>
              )}
            </section>
          )}
          <section aria-label="Decision history" className="border-t border-border mt-7 pt-5">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Check size={16} />
              Decision history
            </h3>
            {review.actions.length === 0 ? (
              <p className="text-sm text-text-muted py-3">
                No recorded actions
                {review.status !== 'pending'
                  ? ' in the new audit trail. This report was reviewed before it was introduced.'
                  : '.'}
              </p>
            ) : (
              <ol className="divide-y divide-border">
                {review.actions.map((action) => (
                  <li key={action.id} className="py-4">
                    <p className="text-sm">{labels[action.action]}</p>
                    <p className="text-xs text-text-muted mt-1">
                      {action.moderator} · {timeAgo(action.created_at)}
                    </p>
                    <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] mt-2">
                      {action.note}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </article>
  );
}
