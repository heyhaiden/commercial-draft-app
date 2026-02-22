import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { getUserIdentity, getCurrentRoomCode } from "@/components/utils/guestAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactionBar from "@/components/game/ReactionBar";
import {
  requestNotificationPermission,
  sendBrowserNotification,
  playAlertSound,
} from "@/lib/notifications";

export default function GlobalRatingModal() {
  const [user, setUser] = useState(null);
  const [showRating, setShowRating] = useState(null);
  const [hasRated, setHasRated] = useState(false);
  const [selectedStars, setSelectedStars] = useState(0);
  const [ratingTimer, setRatingTimer] = useState(null);
  const notifiedBrandRef = useRef(null);
  const queryClient = useQueryClient();
  const roomCode = getCurrentRoomCode();

  useEffect(() => {
    getUserIdentity(base44).then(async (identity) => {
      setUser(identity);
      if (roomCode) requestNotificationPermission();
      if (!identity.isGuest) {
        try {
          const fullUser = await base44.auth.me();
          if (fullUser.role === 'admin') {
            setUser({ ...identity, isAdmin: true });
          }
        } catch (e) {
          // Guest user, continue
        }
      }
    });
  }, [roomCode]);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list(),
  });

  const { data: roomBrandStates = [] } = useQuery({
    queryKey: ["roomBrandStates", roomCode],
    queryFn: () => base44.entities.RoomBrandState.filter({ room_code: roomCode }),
    enabled: !!roomCode,
  });

  const { data: myRatings = [] } = useQuery({
    queryKey: ["myRatings", user?.id, roomCode],
    queryFn: () => base44.entities.Rating.filter({ user_email: user.id, room_code: roomCode }),
    enabled: !!user && !!roomCode,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ["allPlayers", roomCode],
    queryFn: () => base44.entities.Player.filter({ room_code: roomCode }),
    enabled: !!roomCode,
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

  // Auto-show popup when brand starts airing
  useEffect(() => {
    if (airingBrand && !ratedIds.has(airingBrand.id) && !showRating) {
      setShowRating(airingBrand);
      setSelectedStars(0);
      setHasRated(false);

      // Alert the user
      if (notifiedBrandRef.current !== airingBrand.id) {
        notifiedBrandRef.current = airingBrand.id;
        playAlertSound();
        sendBrowserNotification(
          `🔴 ${airingBrand.brand_name} is airing!`,
          "Tap to rate this commercial now."
        );
      }

      if (airingState?.air_started_at) {
        const startTime = new Date(airingState.air_started_at).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, 120 - elapsed);
        setRatingTimer(remaining);
      } else {
        setRatingTimer(120);
      }
    }
  }, [airingBrand?.id]);

  // Synced countdown timer based on air_started_at
  useEffect(() => {
    if (showRating && airingState?.air_started_at) {
      const interval = setInterval(() => {
        const startTime = new Date(airingState.air_started_at).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, 120 - elapsed);
        setRatingTimer(remaining);

        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showRating, airingState?.air_started_at]);

  const rateMutation = useMutation({
    mutationFn: async (variables) => {
      const { brandId, stars } = variables;
      const brand = brands.find(b => b.id === brandId);
      toast.success(`⭐ Rated ${brand.brand_name} ${stars}/5 stars!`);

      await base44.entities.Rating.create({
        user_email: user.id,
        brand_id: brandId,
        brand_name: brand?.brand_name || "",
        room_code: roomCode,
        stars,
      });

      // Check if all players in this room have rated
      const currentRatings = await base44.entities.Rating.filter({
        brand_id: brandId,
        room_code: roomCode
      });
      const totalPlayers = allPlayers.length;

      if (currentRatings.length + 1 >= totalPlayers) {
        // All players have rated - calculate final score and stop airing
        const allStars = [...currentRatings.map(r => r.stars), stars];
        const finalAvg = allStars.reduce((sum, s) => sum + s, 0) / allStars.length;
        const finalPoints = Math.round(finalAvg * 20) - 10;

        // Update or create room brand state
        const existing = await base44.entities.RoomBrandState.filter({ 
          room_code: roomCode, 
          brand_id: brandId 
        });
        if (existing.length > 0) {
          await base44.entities.RoomBrandState.update(existing[0].id, {
            is_airing: false,
            aired: true,
            average_rating: Math.round(finalAvg * 100) / 100,
            total_ratings: allStars.length,
            points: finalPoints,
          });
        } else {
          const brand = brands.find(b => b.id === brandId);
          await base44.entities.RoomBrandState.create({
            room_code: roomCode,
            brand_id: brandId,
            brand_name: brand?.brand_name,
            is_airing: false,
            aired: true,
            average_rating: Math.round(finalAvg * 100) / 100,
            total_ratings: allStars.length,
            points: finalPoints,
          });
        }
        toast.success("All players rated! Ad complete.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRatings"] });
      queryClient.invalidateQueries({ queryKey: ["roomBrandStates"] });
      setHasRated(true);
    },
  });

  if (!user || !roomCode || user.isAdmin) return null;

  return (
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

              {!hasRated ? (
                <>
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
                </>
              ) : (
                <div className="text-center">
                  <p className="text-green-400 font-bold mb-3">Rating submitted!</p>
                  <ReactionBar />
                  <Button
                    onClick={() => {
                      setShowRating(null);
                      setSelectedStars(0);
                      setRatingTimer(null);
                      setHasRated(false);
                    }}
                    variant="outline"
                    className="mt-3 w-full h-11 rounded-2xl bg-[#3d3d2e] border-[#5a5a4a]/30 text-white"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>

            {!hasRated && !ratedIds.has(showRating.id) && (
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
  );
}