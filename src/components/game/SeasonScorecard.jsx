import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

export default function SeasonScorecard({ show, onClose, playerData, brands }) {
  useEffect(() => {
    if (show) {
      // Football confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          shapes: ["circle"],
          colors: ["#f4c542", "#d4a532", "#8B4513"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          shapes: ["circle"],
          colors: ["#f4c542", "#d4a532", "#8B4513"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [show]);

  if (!playerData) return null;

  const myPicks = brands.filter(b => 
    playerData.picks.some(p => p.brand_id === b.id)
  );

  const mvpPick = myPicks.reduce((max, b) => 
    !max || (b.points || 0) > (max.points || 0) ? b : max, null
  );

  const totalScore = myPicks.reduce((sum, b) => sum + (b.points || 0), 0);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/90"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#2d2d1e] to-[#1d1d0e] border-2 border-[#f4c542] overflow-hidden relative"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#f4c542] to-[#d4a532] px-6 py-4 text-center relative">
              <p className="text-[#2d2d1e] text-sm font-bold tracking-wider">SEASON RECAP</p>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#2d2d1e]/30 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-[#2d2d1e]" />
              </button>
            </div>

            <div className="p-6">
              {/* Player Avatar */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center text-4xl border-4 border-[#3d3d2e]">
                    {playerData.icon}
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#f4c542] border-2 border-[#2d2d1e]">
                    <p className="text-[#2d2d1e] text-xs font-black">RANK #{playerData.rank}</p>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-black text-center mb-1 mt-6">@{playerData.displayName}</h2>
              <p className="text-[#a4a498] text-center text-sm mb-6">Pro Drafter • Season 2024</p>

              {/* Final Score */}
              <div className="rounded-2xl bg-[#3d3d2e] border border-[#5a5a4a]/30 p-6 mb-6 text-center">
                <p className="text-[#f4c542] text-sm font-bold tracking-wider mb-2">FINAL SCORE</p>
                <p className="text-white text-6xl font-black">{totalScore}</p>
                <p className="text-[#a4a498] text-sm mt-1">PTS</p>
              </div>

              {/* Highlights */}
              <div className="space-y-3 mb-6">
                {mvpPick && (
                  <div className="rounded-2xl bg-gradient-to-r from-[#f4c542]/10 to-[#d4a532]/10 border border-[#f4c542]/30 p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-2">
                      <img src={mvpPick.logo_url} alt={mvpPick.brand_name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[#f4c542] text-xs font-bold mb-1">⭐ MVP PICK</p>
                      <p className="text-white font-bold">{mvpPick.brand_name}</p>
                      <p className="text-[#a4a498] text-xs">Rated {mvpPick.average_rating}/5 stars</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#3d3d2e] border border-[#5a5a4a]/30 p-3 text-center">
                    <p className="text-[#f4c542] text-xs mb-1">⚡ BIGGEST BUST</p>
                    <p className="text-white text-sm font-bold">
                      {myPicks.filter(b => (b.points || 0) < 0)[0]?.brand_name || "None"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#3d3d2e] border border-[#5a5a4a]/30 p-3 text-center">
                    <p className="text-[#f4c542] text-xs mb-1">💎 HIDDEN GEM</p>
                    <p className="text-white text-sm font-bold">
                      {myPicks.sort((a, b) => (b.points || 0) - (a.points || 0))[2]?.brand_name || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Share Button */}
              <Button className="w-full h-14 rounded-[24px] bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold text-base mb-3">
                <Share2 className="w-4 h-4 mr-2" />
                Share to Story
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-11 rounded-2xl bg-[#3d3d2e] border-[#5a5a4a]/30 text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" className="h-11 rounded-2xl bg-[#3d3d2e] border-[#5a5a4a]/30 text-white">
                  View Leaderboard
                </Button>
              </div>

              {/* Join Next */}
              <div className="mt-6 p-4 rounded-2xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30 text-center">
                <p className="text-[#a4a498] text-xs mb-2">JOIN THE FUN</p>
                <p className="text-white font-bold">CommercialDraft '25</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}