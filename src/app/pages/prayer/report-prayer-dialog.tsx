import { motion } from 'motion/react';
import { X } from 'lucide-react';

type Props = {
  submitting: boolean;
  onClose: () => void;
  onReport: (reason: string) => void;
};

const REPORT_REASONS = ['Spam or fake', 'Upsetting or graphic', 'Harmful or unsafe', 'Something else'];

export function ReportPrayerDialog({ submitting, onClose, onReport }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
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
            onClick={onClose}
            className="text-text-faint hover:text-text-muted transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => void onReport(reason)}
              disabled={submitting}
              className="w-full text-left px-4 py-3 rounded-xl text-xs text-text-muted hover:text-text-secondary hover:bg-accent/8 border border-accent/6 transition-all cursor-pointer"
            >
              {reason}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
