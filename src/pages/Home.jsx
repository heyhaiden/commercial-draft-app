import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Trophy, Shield, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import HowToPlayModal from "@/components/common/HowToPlayModal";

export default function Home() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setAuthChecked(true); }).catch(() => setAuthChecked(true));
  }, []);

  return (
    <div className="min-h-screen bg-[#3d3d2e] text-white overflow-hidden pb-20 md:pb-0">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#3d3d2e] via-[#2d2d1e] to-[#1d1d0e] pointer-events-none" />
      
      <div className="relative max-w-md mx-auto px-6 py-8 flex flex-col items-center justify-center min-h-screen">
        {/* Live Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4a4a3a]/40 border border-[#5a5a4a]/50 backdrop-blur-sm mb-6"
        >
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-[#d4d4c8] font-medium tracking-wide">SUPER BOWL LVIII SEASON</span>
        </motion.div>

        {/* App Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-28 h-28 rounded-[28px] bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center shadow-2xl mb-6 border-4 border-[#3d3d2e]"
        >
          <Trophy className="w-14 h-14 text-[#3d3d2e]" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-black text-center mb-3 leading-tight"
        >
          <span className="italic text-white">COMM</span>
          <span className="italic text-[#f4c542]">ERCIAL</span>
          <br />
          <span className="italic text-white">DRAFT</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[#a4a498] text-center mb-8 max-w-xs text-sm"
        >
          The fantasy league for the world's most expensive ads.
        </motion.p>

        {/* Join Button */}
        {authChecked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full"
          >
            {user ? (
              <Link to={createPageUrl("JoinGame")} className="block">
                <Button className="w-full h-16 rounded-[24px] bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold text-lg shadow-xl border-2 border-[#2d2d1e]/20 flex items-center justify-center gap-3">
                  <Trophy className="w-6 h-6" />
                  JOIN THE GAME
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </Link>
            ) : (
              <Button
                onClick={() => base44.auth.redirectToLogin()}
                className="w-full h-16 rounded-[24px] bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold text-lg shadow-xl border-2 border-[#2d2d1e]/20"
              >
                SIGN IN TO PLAY
              </Button>
            )}

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
                className="w-11/12 mx-auto h-12 rounded-[20px] bg-transparent border-2 border-[#5a5a4a]/40 hover:border-[#f4c542] hover:bg-[#f4c542]/10 text-[#d4d4c8] hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <BookOpen className="w-4 h-4" />
                How to Play
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Admin Link */}
        {user?.role === "admin" && (
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
        )}
      </div>

      <HowToPlayModal show={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </div>
  );
}