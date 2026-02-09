import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Users, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HowToPlayModal({ show, onClose }) {
  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[#2d2d1e] rounded-3xl border-2 border-[#5a5a4a]/30 max-w-md w-full max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-[#f4c542] to-[#d4a532] p-6 rounded-t-3xl">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#2d2d1e]/50 flex items-center justify-center hover:bg-[#2d2d1e] transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <h2 className="text-2xl font-black text-[#2d2d1e] italic">HOW TO PLAY</h2>
                <p className="text-[#3d3d2e] text-sm mt-1">Draft. Watch. Win.</p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-[#2d2d1e]" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-1">1. Join a Room</h3>
                    <p className="text-[#a4a498] text-sm">
                      Get your room code from the commissioner and join with up to 8 players. Choose your icon and get ready to draft!
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-6 h-6 text-[#2d2d1e]" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-1">2. Draft Your Lineup</h3>
                    <p className="text-[#a4a498] text-sm">
                      Pick 5 commercials you think will be fan favorites. Snake draft style—choose wisely! Timer's ticking, so don't miss your turn.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center flex-shrink-0">
                    <Star className="w-6 h-6 text-[#2d2d1e]" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-1">3. Watch & Rate</h3>
                    <p className="text-[#a4a498] text-sm">
                      Rate each commercial as it airs during the game. Give stars from 1-5. Your ratings power the points!
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-[#2d2d1e]" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-1">4. Track Your Score</h3>
                    <p className="text-[#a4a498] text-sm">
                      Higher average ratings = more points. Watch the leaderboard live and see if you've got what it takes to win!
                    </p>
                  </div>
                </div>

                {/* Scoring Info */}
                <div className="rounded-2xl bg-[#3d3d2e] border border-[#5a5a4a]/30 p-4">
                  <h4 className="text-[#f4c542] font-bold mb-2 text-sm">💡 SCORING</h4>
                  <p className="text-[#a4a498] text-xs leading-relaxed">
                    Each commercial earns points based on its average star rating from all players. 
                    <span className="block mt-2 text-white">
                      5 stars = 90 pts • 4 stars = 70 pts • 3 stars = 50 pts • 2 stars = 30 pts • 1 star = 10 pts
                    </span>
                  </p>
                </div>

                <Button
                  onClick={onClose}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold"
                >
                  GOT IT, LET'S PLAY!
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}