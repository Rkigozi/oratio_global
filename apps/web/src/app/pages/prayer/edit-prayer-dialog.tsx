import { motion } from 'motion/react';
import { Loader, X } from 'lucide-react';

type Props = {
  text: string;
  error: string;
  saving: boolean;
  onClose: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
};

export function EditPrayerDialog({ text, error, saving, onClose, onChange, onSave }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
      style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
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
            onClick={onClose}
            className="h-9 w-9 rounded-full flex items-center justify-center text-text-faint hover:text-text-muted hover:bg-accent/8 transition-colors cursor-pointer"
            aria-label="Close edit prayer"
          >
            <X size={16} />
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          maxLength={500}
          className="w-full rounded-xl px-4 py-3 text-text placeholder-text-dim text-sm focus:outline-none border border-accent/12 resize-none"
          style={{
            background: 'rgba(var(--rgb-bg), 0.35)',
            lineHeight: 1.7,
          }}
        />
        <div className="mt-2 flex items-center gap-3">
          {error ? (
            <p className="text-danger text-xs flex-1">{error}</p>
          ) : (
            <p className="text-text-dim text-xs flex-1">Update wording for clarity.</p>
          )}
          <p
            className={`text-xs ${text.length > 500 || text.trim().length < 10 ? 'text-danger' : 'text-text-dim'}`}
          >
            {text.length}/500
          </p>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-accent/12 px-4 py-3 text-sm text-text-muted transition-colors hover:bg-accent/6 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 rounded-full px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            style={{
              background:
                'linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))',
              color: 'rgb(var(--rgb-text))',
            }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {saving && <Loader size={14} className="animate-spin" />}
              {saving ? 'Saving...' : 'Save update'}
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
