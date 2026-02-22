import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getUserIdentity, getCurrentRoomCode } from "@/components/utils/guestAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Star, X, Info } from "lucide-react";


export default function Rate() {
  const [showRulesPopup, setShowRulesPopup] = useState(false);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const roomCode = getCurrentRoomCode();

  useEffect(() => {
    getUserIdentity(base44).then(setUser);
  }, []);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list(),
  });

  const { data: roomBrandStates = [] } = useQuery({
    queryKey: ["roomBrandStates", roomCode],
    queryFn: () => base44.entities.RoomBrandState.filter({ room_code: roomCode }),
    enabled: !!roomCode,
  });

  // Filter ratings by room_code to scope to current game
  const { data: myRatings = [] } = useQuery({
    queryKey: ["myRatings", user?.id, roomCode],
    queryFn: () => base44.entities.Rating.filter({ user_email: user.id, room_code: roomCode }),
    enabled: !!user && !!roomCode,
  });

  const airingState = roomBrandStates.find(s => s.is_airing);
  const airingBrand = airingState ? brands.find(b => b.id === airingState.brand_id) : null;
  const ratedIds = new Set(myRatings.map(r => r.brand_id));

  // Real-time sync for room brand state
  useEffect(() => {
    const unsubscribe = base44.entities.RoomBrandState.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["roomBrandStates"] });
    });
    return unsubscribe;
  }, [queryClient]);





  return (
    <div className="min-h-screen bg-[#1d1d0e] text-white pb-24">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black">RATE ADS</h1>
          <button 
            onClick={() => setShowRulesPopup(true)}
            className="w-9 h-9 rounded-full bg-[#4a4a3a]/40 flex items-center justify-center"
          >
            <Info className="w-5 h-5 text-[#f4c542]" />
          </button>
        </div>

        {airingBrand && (
          <div className="rounded-3xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30 p-4 mb-6 animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <p className="text-red-400 text-sm font-bold">ACTIVE AD</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center p-2">
                <img src={airingBrand.logo_url} alt={airingBrand.brand_name} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-lg">{airingBrand.brand_name} - {airingBrand.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-bold">{(airingState?.average_rating || 0).toFixed(1)}/5</span>
                </div>
              </div>
              {ratedIds.has(airingBrand.id) && (
                <span className="text-green-400 text-sm font-bold">✓ RATED</span>
              )}
            </div>
          </div>
        )}

        {roomBrandStates.filter(s => s.aired).length === 0 && !airingBrand && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-[#4a4a3a]/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📺</span>
            </div>
            <h3 className="text-xl font-bold mb-2">No Ads Yet</h3>
            <p className="text-[#a4a498] text-sm px-8">Commercials will appear here to rate during the game. Get ready to score them!</p>
          </div>
        )}

        <div className="space-y-2">
          {roomBrandStates.filter(s => s.aired).sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0)).map(state => {
            const brand = brands.find(b => b.id === state.brand_id);
            if (!brand) return null;
            const hasRated = ratedIds.has(brand.id);
            return (
              <div
                key={brand.id}
                className={`rounded-2xl border p-3 flex items-center gap-3 ${
                  hasRated ? "bg-[#2d2d1e]/50 border-[#5a5a4a]/30 opacity-60" : "bg-[#2d2d1e] border-[#5a5a4a]/30"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-2">
                  <img src={brand.logo_url} alt={brand.brand_name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{brand.brand_name}</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-white text-sm">{(state.average_rating || 0).toFixed(1)}</span>
                  </div>
                </div>
                {hasRated ? (
                  <span className="text-green-400 text-sm font-bold">✓</span>
                ) : (
                  <span className="text-[#a4a498] text-xs">Not rated</span>
                )}
              </div>
            );
          })}
        </div>
      </div>



      {/* Rules Popup */}
      <AnimatePresence>
        {showRulesPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md rounded-3xl bg-[#3d3d2e] border border-[#5a5a4a]/50 overflow-hidden"
            >
              <div className="bg-[#f4c542] px-6 py-3 flex items-center justify-between">
                <p className="text-[#2d2d1e] text-sm font-bold tracking-wider">HOW IT WORKS</p>
                <button onClick={() => setShowRulesPopup(false)} className="w-8 h-8 rounded-full bg-[#2d2d1e]/20 flex items-center justify-center">
                  <X className="w-4 h-4 text-[#2d2d1e]" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-[#f4c542] font-bold mb-2">📺 Rating System</h3>
                  <p className="text-sm text-[#d4d4c8]">
                    When a commercial airs, all players rate it from 1-5 stars. The average rating determines the points earned.
                  </p>
                </div>

                <div>
                  <h3 className="text-[#f4c542] font-bold mb-2">⭐ Point Calculation</h3>
                  <p className="text-sm text-[#d4d4c8] mb-2">
                    Points = (Average Rating × 20) - 10
                  </p>
                  <ul className="text-xs text-[#a4a498] space-y-1 ml-4">
                    <li>• 5 stars = 90 points</li>
                    <li>• 4 stars = 70 points</li>
                    <li>• 3 stars = 50 points</li>
                    <li>• 2 stars = 30 points</li>
                    <li>• 1 star = 10 points</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-[#f4c542] font-bold mb-2">🏆 Winning</h3>
                  <p className="text-sm text-[#d4d4c8]">
                    Draft 5 commercials. The player with the highest total score after all ads have aired and been rated wins!
                  </p>
                </div>

                <div>
                  <h3 className="text-[#f4c542] font-bold mb-2">⚡ Live Ratings</h3>
                  <p className="text-sm text-[#d4d4c8]">
                    Rate commercials as they air during the game. You'll get a popup notification when it's time to vote!
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}