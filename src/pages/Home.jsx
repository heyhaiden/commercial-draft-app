import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Trophy, Shield, BookOpen, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import HowToPlayModal from "@/components/common/HowToPlayModal";

// Floating icons configuration
const floatingIcons = [
  { icon: "🏈", delay: 0, x: "10%", duration: 6 },
  { icon: "📺", delay: 1.5, x: "85%", duration: 7 },
  { icon: "⭐", delay: 0.8, x: "20%", duration: 5 },
  { icon: "🏆", delay: 2, x: "75%", duration: 6.5 },
  { icon: "🎬", delay: 1.2, x: "40%", duration: 5.5 },
  { icon: "💰", delay: 2.5, x: "60%", duration: 7 },
];

export default function Home() {
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <div className="min-h-screen bg-[#3d3d2e] text-white overflow-hidden pb-20 md:pb-0">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#3d3d2e] via-[#2d2d1e] to-[#1d1d0e] pointer-events-none" />

      {/* Animated background glow */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#f4c542]/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Floating emojis */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {floatingIcons.map((item, index) => (
          <motion.div
            key={index}
            className="absolute text-2xl opacity-20"
            style={{ left: item.x }}
            initial={{ y: "110vh", rotate: 0 }}
            animate={{
              y: "-10vh",
              rotate: 360,
            }}
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {item.icon}
          </motion.div>
        ))}
      </div>
      
      <div className="relative max-w-md mx-auto px-6 py-8 flex flex-col items-center justify-center min-h-screen text-center">
        {/* Live Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4a4a3a]/40 border border-[#5a5a4a]/50 backdrop-blur-sm mb-6"
        >
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-[#d4d4c8] font-medium tracking-wide">THE BIG GAME 2026</span>
        </motion.div>

        {/* App Icon with glow effect */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative mb-6"
        >
          {/* Pulsing glow behind icon */}
          <motion.div
            className="absolute inset-0 w-28 h-28 rounded-[28px] bg-[#f4c542]"
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ filter: "blur(20px)" }}
          />
          <motion.div
            className="relative w-28 h-28 rounded-[28px] bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center shadow-2xl border-4 border-[#3d3d2e]"
            animate={{
              rotate: [0, 2, -2, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Trophy className="w-14 h-14 text-[#3d3d2e]" />
          </motion.div>

          {/* Sparkles around icon */}
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0,
            }}
          >
            <Star className="w-5 h-5 text-[#f4c542] fill-[#f4c542]" />
          </motion.div>
          <motion.div
            className="absolute -bottom-1 -left-2"
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.5,
            }}
          >
            <Zap className="w-4 h-4 text-[#f4c542] fill-[#f4c542]" />
          </motion.div>
        </motion.div>

        {/* Title with shimmer effect */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-black text-center mb-3 leading-tight relative"
        >
          <span className="italic text-white">COMM</span>
          <motion.span
            className="italic text-[#f4c542] inline-block"
            animate={{
              textShadow: [
                "0 0 10px rgba(244, 197, 66, 0.3)",
                "0 0 20px rgba(244, 197, 66, 0.6)",
                "0 0 10px rgba(244, 197, 66, 0.3)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            ERCIAL
          </motion.span>
          <br />
          <motion.span
            className="italic text-white inline-block"
            animate={{
              textShadow: [
                "0 0 5px rgba(255, 255, 255, 0.1)",
                "0 0 15px rgba(255, 255, 255, 0.3)",
                "0 0 5px rgba(255, 255, 255, 0.1)",
              ],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          >
            DRAFT
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
         <motion.p
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.4 }}
           className="text-[#a4a498] text-center mb-8 max-w-xs text-sm"
         >
           CommercialDraft '26 - The fantasy league for the world's most expensive ads.
         </motion.p>

        {/* Join Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full"
        >
          <Link to={createPageUrl("JoinGame")} className="block">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Button glow effect */}
              <motion.div
                className="absolute inset-0 rounded-[24px] bg-[#f4c542]"
                animate={{
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{ filter: "blur(15px)" }}
              />
              <Button className="relative w-full h-16 rounded-[24px] bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold text-lg shadow-xl border-2 border-[#2d2d1e]/20 flex items-center justify-center gap-3">
                <Trophy className="w-6 h-6" />
                JOIN THE GAME
                <motion.svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={{ x: [0, 4, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </motion.svg>
              </Button>
            </motion.div>
          </Link>

          {/* How to Play Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-3"
          >
            <Button
              onClick={() => setShowHowToPlay(true)}
              variant="outline"
              className="w-10/12 mx-auto h-12 rounded-[20px] bg-transparent border-2 border-[#5a5a4a]/40 hover:border-[#f4c542] hover:bg-[#f4c542]/10 text-[#d4d4c8] hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              How to Play
            </Button>
          </motion.div>
        </motion.div>

        {/* Admin Link - Available to All */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-8"
        >
          <Link to={createPageUrl("CreateRoom")}>
            <button className="flex items-center gap-2 text-[#a4a498] hover:text-white transition-colors text-sm">
              <Shield className="w-4 h-4" />
              Admin & Host Access
            </button>
          </Link>
        </motion.div>
      </div>

      <HowToPlayModal show={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </div>
  );
}