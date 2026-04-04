import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { PrayerRequest } from "../data/prayer-data";

interface PrayerCardProps {
  prayer: PrayerRequest;
  onClose: () => void;
  onPrayed: (id: string) => void;
}

export function PrayerCard({ prayer, onClose, onPrayed }: PrayerCardProps) {
  const [prayed, setPrayed] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handlePray = () => {
    setPrayed(true);
    onPrayed(prayer.id);
    setTimeout(() => setShowConfirmation(true), 600);
  };

  return (
    <div className="w-full relative min-h-[280px] flex flex-col justify-center">
      <AnimatePresence mode="wait">
        {!showConfirmation ? (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35 }}
            className="w-full flex flex-col items-center"
          >
            {/* Location */}
            <p className="text-[#6b7499] text-xs uppercase tracking-[0.2em] mb-5">
              {prayer.city}, {prayer.country}
            </p>

            {/* Prayer text */}
            <p
              className="text-[#e2e4f0] text-center font-heading max-w-xs mb-6"
              style={{ fontSize: "1.15rem", lineHeight: 1.7, fontWeight: 300 }}
            >
              &ldquo;{prayer.text}&rdquo;
            </p>

            {/* Name */}
            {prayer.name && (
              <p className="text-[#6b7499] text-sm mb-4">&mdash; {prayer.name}</p>
            )}

            {/* Prayer count */}
            <div className="flex items-center gap-1.5 text-[#6b7499] text-xs mb-8">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{
                  background: "#7c8fff",
                  boxShadow: "0 0 6px rgba(124,143,255,0.5)",
                }}
              />
              <span>{prayer.prayerCount + (prayed ? 1 : 0)} people prayed</span>
            </div>

            {/* "I Prayed" button */}
            <motion.button
              onClick={handlePray}
              disabled={prayed}
              whileTap={!prayed ? { scale: 0.96 } : undefined}
              className="flex items-center gap-2.5 px-8 py-3 rounded-full text-sm transition-all duration-500 cursor-pointer disabled:cursor-default"
              style={{
                background: prayed
                  ? "rgba(124, 143, 255, 0.12)"
                  : "linear-gradient(135deg, #7c8fff, #5a6fd6)",
                color: prayed ? "#7c8fff" : "#ffffff",
                boxShadow: prayed
                  ? "none"
                  : "0 4px 24px rgba(124, 143, 255, 0.25), 0 0 0 1px rgba(124,143,255,0.1)",
              }}
            >
              <span className="text-base">🙏</span>
              {prayed ? "Prayed" : "I Prayed"}
            </motion.button>

            <p className="text-[#4e5573] text-xs mt-4">
              Take a moment to pray for this person
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="confirmation"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full text-center flex flex-col items-center justify-center py-4"
          >
            {/* Glow orb */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", damping: 18, stiffness: 150 }}
              className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{
                background:
                  "radial-gradient(circle, rgba(245,243,255,0.15), rgba(124,143,255,0.04))",
                boxShadow: "0 0 50px rgba(124, 143, 255, 0.12)",
              }}
            >
              <motion.div
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="w-3 h-3 rounded-full"
                style={{
                  background: "#F5F3FF",
                  boxShadow: "0 0 12px rgba(245,243,255,0.6)",
                }}
              />
            </motion.div>

            <h2
              className="text-[#e2e4f0] mb-2 font-heading"
              style={{ fontSize: "1.25rem", fontWeight: 300 }}
            >
              Thank you for praying
            </h2>
            <p className="text-[#6b7499] text-sm mb-8">
              Your prayer has been counted.
            </p>

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full text-sm text-[#8b96c0] bg-[rgba(124,143,255,0.06)] border border-[rgba(124,143,255,0.1)] hover:bg-[rgba(124,143,255,0.12)] transition-all cursor-pointer"
            >
              Return to Map
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
