import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getUserIdentity } from "@/components/utils/guestAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Star, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Rate() {
  const [showRulesPopup, setShowRulesPopup] = useState(false);
  const [user, setUser] = useState(null);
  const [showRating, setShowRating] = useState(null);
  const [selectedStars, setSelectedStars] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    getUserIdentity(base44).then(setUser);
  }, []);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list(),
    refetchInterval: 3000,
  });

  const { data: myRatings = [] } = useQuery({
    queryKey: ["myRatings", user?.id],
    queryFn: () => base44.entities.Rating.filter({ user_email: user.id }),
    enabled: !!user,
  });

  const airingBrand = brands.find(b => b.is_airing);
  const ratedIds = new Set(myRatings.map(r => r.brand_id));

  const [ratingTimer, setRatingTimer] = useState(null);

  // Auto-show popup when brand starts airing
  useEffect(() => {
    if (airingBrand && !ratedIds.has(airingBrand.id) && !showRating) {
      setShowRating(airingBrand);
      setSelectedStars(0);
      setRatingTimer(120); // 2 minutes
    }
  }, [airingBrand?.id]);

  // Rating countdown timer
  useEffect(() => {
    if (ratingTimer !== null && ratingTimer > 0 && showRating) {
      const interval = setInterval(() => {
        setRatingTimer(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [ratingTimer, showRating]);

  const rateMutation = useMutation({
    mutationFn: async ({ brandId, stars }) => {
      const brand = brands.find(b => b.id === brandId);
      toast.success(`⭐ Rated ${brand.brand_name} ${stars}/5 stars!`);
      await base44.entities.Rating.create({
        user_email: user.id,
        brand_id: brandId,
        brand_name: brand?.brand_name || "",
        stars,
      });
      const newTotal = (brand.total_ratings || 0) + 1;
      const newAvg = (((brand.average_rating || 0) * (brand.total_ratings || 0)) + stars) / newTotal;
      const newPoints = Math.round(newAvg * 20) - 10;
      await base44.entities.Brand.update(brandId, {
        average_rating: Math.round(newAvg * 100) / 100,
        total_ratings: newTotal,
        points: newPoints,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRatings"] });
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      setShowRating(null);
      setSelectedStars(0);
      setRatingTimer(null);
    },
  });

  return (
    <div className="min-h-screen bg-[#1d1d0e] text-white pb-24">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black">Ratings</h1>
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
              <p className="text-red-400 text-sm font-bold">TRENDING AD</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center p-2">
                <img src={airingBrand.logo_url} alt={airingBrand.brand_name} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-lg">{airingBrand.brand_name} - {airingBrand.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-bold">{(airingBrand.average_rating || 0).toFixed(1)}/5</span>
                </div>
              </div>
              {!ratedIds.has(airingBrand.id) && (
                <button
                  onClick={() => setShowRating(airingBrand)}
                  className="px-4 py-2 rounded-xl bg-white text-red-600 font-bold text-sm"
                >
                  RATE
                </button>
              )}
            </div>
          </div>
        )}

        {brands.filter(b => b.aired).length === 0 && !airingBrand && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-[#4a4a3a]/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📺</span>
            </div>
            <h3 className="text-xl font-bold mb-2">No Ads Yet</h3>
            <p className="text-[#a4a498] text-sm px-8">Commercials will appear here to rate during the game. Get ready to score them!</p>
          </div>
        )}

        <div className="space-y-2">
          {brands.filter(b => b.aired).sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0)).map(brand => {
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
                    <span className="text-white text-sm">{(brand.average_rating || 0).toFixed(1)}</span>
                  </div>
                </div>
                {!hasRated && (
                  <button
                    onClick={() => {
                      setShowRating(brand);
                      setSelectedStars(0);
                    }}
                    className="px-3 py-1 rounded-lg bg-[#f4c542] text-[#2d2d1e] font-bold text-sm"
                  >
                    Rate
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rating Popup */}
      <AnimatePresence>
        {showRating && (
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
              <div className="bg-[#f4c542] px-6 py-3 text-center">
                <p className="text-[#2d2d1e] text-sm font-bold tracking-wider">🔴 LIVE COMMERCIAL ALERT</p>
              </div>

              <div className="p-6">
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center border-4 border-[#f4c542] p-3">
                    <img src={showRating.logo_url} alt={showRating.brand_name} className="w-full h-full object-contain" />
                  </div>
                </div>

                <h2 className="text-3xl font-black text-center mb-2">{showRating.brand_name}</h2>
                <p className="text-[#a4a498] text-center mb-6">{showRating.title}</p>

                <div className="flex items-center justify-between mb-6">
                  <p className="text-[#a4a498] text-sm font-bold">YOUR RATING</p>
                  <p className="text-[#f4c542] text-xl font-black">{selectedStars}/5 STARS</p>
                </div>

                <div className="flex gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setSelectedStars(star)}
                      className={`flex-1 aspect-square rounded-2xl flex items-center justify-center transition-all ${
                        selectedStars >= star
                          ? "bg-gradient-to-br from-[#f4c542] to-[#d4a532]"
                          : "bg-[#4a4a3a]/40"
                      }`}
                    >
                      <Star
                        className={`w-8 h-8 ${selectedStars >= star ? "text-[#2d2d1e] fill-[#2d2d1e]" : "text-[#6a6a5a]"}`}
                      />
                    </button>
                  ))}
                </div>

                <Button
                  onClick={() => rateMutation.mutate({ brandId: showRating.id, stars: selectedStars })}
                  disabled={selectedStars === 0 || rateMutation.isPending}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold text-lg disabled:opacity-30"
                >
                  Submit Rating ▶
                </Button>

                <div className="mt-4 text-center">
                  <p className="text-[#a4a498] text-xs">TIME REMAINING</p>
                  <p className={`text-lg font-bold ${ratingTimer <= 10 ? 'text-red-400 animate-pulse' : 'text-[#f4c542]'}`}>
                    {ratingTimer !== null ? `${Math.floor(ratingTimer / 60)}:${String(ratingTimer % 60).padStart(2, '0')}` : '2:00'}
                  </p>
                </div>
              </div>

              {!ratedIds.has(showRating.id) && (
                <button
                  onClick={() => {
                    setShowRating(null);
                    setRatingTimer(null);
                  }}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#2d2d1e]/80 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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