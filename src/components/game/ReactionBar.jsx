import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const REACTIONS = [
  { emoji: "🔥", label: "Fire" },
  { emoji: "😂", label: "Hilarious" },
  { emoji: "💀", label: "Dead" },
  { emoji: "👏", label: "Clap" },
  { emoji: "🤯", label: "Mind Blown" },
  { emoji: "💩", label: "Terrible" },
];

export default function ReactionBar() {
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  const handleReaction = useCallback((emoji) => {
    const id = Date.now() + Math.random();
    const x = Math.random() * 60 + 20;
    setFloatingEmojis((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 2000);
  }, []);

  return (
    <div className="relative">
      <div className="fixed inset-0 pointer-events-none z-[150]">
        <AnimatePresence>
          {floatingEmojis.map(({ id, emoji, x }) => (
            <motion.div
              key={id}
              initial={{ opacity: 1, y: "80vh", scale: 1 }}
              animate={{ opacity: 0, y: "20vh", scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute text-4xl"
              style={{ left: `${x}%` }}
            >
              {emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-2 py-3">
        <span className="text-[#a4a498] text-xs font-bold mr-1">REACT</span>
        {REACTIONS.map(({ emoji, label }) => (
          <motion.button
            key={label}
            whileTap={{ scale: 1.5 }}
            onClick={() => handleReaction(emoji)}
            className="w-10 h-10 rounded-full bg-[#4a4a3a]/40 border border-[#5a5a4a]/30 flex items-center justify-center text-lg hover:bg-[#5a5a4a]/40 transition-colors active:bg-[#f4c542]/20"
            title={label}
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
