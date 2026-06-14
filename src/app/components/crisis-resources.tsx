import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, ExternalLink, ChevronDown } from "lucide-react";

const RESOURCES = [
  {
    name: "Find A Helpline",
    url: "https://findahelpline.com/",
    description: "Select your country to find local crisis support",
  },
  {
    name: "Befrienders Worldwide",
    url: "https://www.befrienders.org/",
    description: "Emotional support in many countries around the world",
  },
  {
    name: "IASP",
    url: "https://www.iasp.info/resources/Crisis_Centres/",
    description: "Directory of crisis centres worldwide",
  },
];

export function CrisisResources() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "rgba(var(--rgb-accent), 0.02)",
        borderColor: "rgba(var(--rgb-accent), 0.05)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left cursor-pointer"
      >
        <Heart size={13} className="text-accent flex-shrink-0" />
        <span className="text-accent text-xs flex-1 min-w-0">
          If you&apos;re going through something difficult — you&apos;re not
          alone.
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} className="text-text-dim" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <p className="text-text-muted text-xs leading-relaxed">
                We&apos;re praying with you, and we want you to have every
                support available. These organisations are here to listen and
                help:
              </p>
              <ul className="space-y-2">
                {RESOURCES.map((r) => (
                  <li key={r.name}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 group"
                    >
                      <ExternalLink
                        size={11}
                        className="text-text-dim mt-0.5 flex-shrink-0 group-hover:text-accent transition-colors"
                      />
                      <div>
                        <span className="text-accent text-xs group-hover:underline">
                          {r.name}
                        </span>
                        <p className="text-text-dim text-[11px] mt-px">
                          {r.description}
                        </p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
