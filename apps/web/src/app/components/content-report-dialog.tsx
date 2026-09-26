import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Loader, X } from 'lucide-react';
import { countReportDetailsCharacters, REPORT_DETAILS_MAX_LENGTH } from '@oratio/shared/validation';

type Props = {
  submitting: boolean;
  error?: string | null;
  reportableType?: 'prayer' | 'comment';
  onClose: () => void;
  onReport: (reason: string, details?: string) => Promise<void>;
};

const REPORT_REASONS = [
  'Spam or fake',
  'Upsetting or graphic',
  'Harmful or unsafe',
  'Something else',
];

export function ContentReportDialog({
  submitting,
  error,
  reportableType = 'prayer',
  onClose,
  onReport,
}: Props) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const submitLock = useRef(false);
  const detailsFeedbackId = useId();
  const detailsCount = countReportDetailsCharacters(details);
  const excessCharacters = detailsCount - REPORT_DETAILS_MAX_LENGTH;
  const detailsTooLong = excessCharacters > 0;
  const detailsFeedback = detailsTooLong
    ? `${excessCharacters} character${excessCharacters === 1 ? '' : 's'} over the ${REPORT_DETAILS_MAX_LENGTH}-character limit. Shorten your details to submit.`
    : excessCharacters === 0
      ? `Character limit reached (${REPORT_DETAILS_MAX_LENGTH} characters).`
      : `Maximum ${REPORT_DETAILS_MAX_LENGTH} characters.`;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    form.current?.querySelector<HTMLInputElement>('input')?.focus();
    return () => previous?.focus();
  }, []);

  const submit = async () => {
    if (!reason || submitting || submitLock.current || detailsTooLong) return;
    submitLock.current = true;
    try {
      await onReport(reason, details.trim() || undefined);
    } finally {
      submitLock.current = false;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <form
        ref={form}
        role="dialog"
        aria-modal="true"
        aria-label={`Report ${reportableType}`}
        className="w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-lg p-5 bg-surface border border-border text-text-primary"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !submitting) {
            event.preventDefault();
            onClose();
          }
          if (event.key === 'Tab') {
            const controls = Array.from(
              form.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled), input:not(:disabled), textarea:not(:disabled)'
              ) ?? []
            );
            const first = controls[0];
            const last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header className="flex justify-between items-center gap-3 mb-3">
          <h2 className="text-base font-medium">Report {reportableType}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            title="Close report"
            aria-label="Close report"
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg hover:bg-bg"
          >
            <X size={18} />
          </button>
        </header>
        {error && (
          <p role="alert" className="text-sm text-danger mb-3">
            {error}
          </p>
        )}
        <fieldset disabled={submitting}>
          <legend className="text-sm text-text-muted mb-2">Why are you reporting this?</legend>
          {REPORT_REASONS.map((value) => (
            <label
              key={value}
              className="flex items-center gap-3 min-h-11 text-sm border-b border-border py-2 cursor-pointer"
            >
              <input
                type="radio"
                name="report-reason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="accent-accent w-4 h-4 shrink-0"
              />
              {value}
            </label>
          ))}
          <label className="block text-sm mt-4">
            Additional details (optional)
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              aria-describedby={detailsFeedbackId}
              aria-invalid={detailsTooLong || undefined}
              rows={4}
              className={`block mt-2 w-full min-h-24 resize-y rounded-lg bg-bg border p-3 text-sm text-text-primary ${detailsTooLong ? 'border-danger' : 'border-border'}`}
            />
          </label>
          <p
            className={`text-xs text-right mt-1 ${detailsTooLong ? 'text-danger' : 'text-text-muted'}`}
          >
            {detailsCount}/{REPORT_DETAILS_MAX_LENGTH}
          </p>
          <p
            id={detailsFeedbackId}
            role={detailsTooLong ? 'alert' : undefined}
            aria-live="polite"
            className={`text-xs mt-1 ${detailsTooLong ? 'text-danger' : 'text-text-muted'}`}
          >
            {detailsFeedback}
          </p>
        </fieldset>
        <button
          type="submit"
          disabled={submitting || !reason || detailsTooLong}
          className="w-full min-h-11 flex items-center justify-center gap-2 rounded-lg bg-accent text-white text-sm mt-4 disabled:opacity-50"
        >
          {submitting && <Loader size={16} className="animate-spin" />}
          {submitting ? 'Sending report' : 'Submit report'}
        </button>
      </form>
    </motion.div>
  );
}
