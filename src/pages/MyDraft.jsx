import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getUserIdentity, getCurrentRoomCode } from "@/components/utils/guestAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrandCardSkeleton } from "@/components/common/LoadingSkeleton";
import OnboardingTooltip from "@/components/common/OnboardingTooltip";
import { motion } from "framer-motion";
import { getRoomBrandStates } from "@/components/utils/brandState";

export default function MyDraft() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());
  // Initialize roomCode immediately from sessionStorage to avoid uninitialized variable errors
  const roomCode = getCurrentRoomCode();

  // Safe image error handler - no XSS
  const handleImageError = useCallback((brandId) => {
    setFailedImages(prev => new Set([...prev, brandId]));
  }, []);

  useEffect(() => {
    getUserIdentity(base44).then(setUser).catch((error) => {
      // Silently handle errors - getUserIdentity already handles fallback
      // Don't log 401/403 errors as they're expected for guest users
      if (error?.status !== 401 && error?.status !== 403) {
        console.error('Failed to get user identity:', error);
      }
    });
  }, []);
  
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list(),
  });

  // Get current room
  const { data: rooms = [] } = useQuery({
    queryKey: ["room", roomCode],
    queryFn: () => base44.entities.GameRoom.filter({ room_code: roomCode }),
    enabled: !!roomCode,
  });
  const currentRoom = rooms[0];

  // Get all room-scoped ratings
  const { data: allRoomRatings = [] } = useQuery({
    queryKey: ["allRoomRatings", roomCode],
    queryFn: async () => {
      const ratings = await base44.entities.Rating.list("-created_date", 500);
      // Filter to only ratings from this room (user_email starts with roomCode:)
      return ratings.filter(r => r.user_email?.startsWith(`${roomCode}:`));
    },
    enabled: !!roomCode,
  });

  // Use RoomDraftPick scoped to current room
  const { data: myPicks = [], isLoading: picksLoading } = useQuery({
    queryKey: ["myPicks", user?.id, roomCode],
    queryFn: async () => {
      if (!user?.id || !roomCode) return [];
      // Fetch all picks for this room and filter client-side to handle guest IDs
      const allRoomPicks = await base44.entities.RoomDraftPick.filter({ room_code: roomCode });
      // Filter picks by user email - handle both exact match and potential variations
      const filtered = allRoomPicks.filter(pick => {
        // Exact match
        if (pick.user_email === user.id) return true;
        // Also check if user.id might be in a different format
        return pick.user_email?.includes(user.id) || user.id?.includes(pick.user_email);
      });
      return filtered;
    },
    enabled: !!user?.id && !!roomCode,
  });

  // Show onboarding after draft is complete (when user has picks)
  useEffect(() => {
    if (myPicks.length > 0 && !picksLoading) {
      const hasSeenPostDraftOnboarding = localStorage.getItem("hasSeenPostDraftOnboarding");
      if (!hasSeenPostDraftOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [myPicks.length, picksLoading]);

  const { data: allPicks = [] } = useQuery({
    queryKey: ["allPicks", roomCode],
    queryFn: () => base44.entities.RoomDraftPick.filter({ room_code: roomCode }),
    enabled: !!roomCode,
  });

  // Calculate room-scoped brand states
  const roomBrandStates = useMemo(() => {
    if (!roomCode || !currentRoom) return brands;
    return getRoomBrandStates(brands, allRoomRatings, roomCode, currentRoom);
  }, [brands, allRoomRatings, roomCode, currentRoom]);

  // Real-time sync for room, brand, and rating updates
  useEffect(() => {
    if (!roomCode) return;
    const unsubscribeRoom = base44.entities.GameRoom.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["room", roomCode] });
    });
    const unsubscribeBrands = base44.entities.Brand.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    });
    const unsubscribeRatings = base44.entities.Rating.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["allRoomRatings", roomCode] });
    });
    return () => {
      unsubscribeRoom();
      unsubscribeBrands();
      unsubscribeRatings();
    };
  }, [queryClient, roomCode]);

  // Real-time sync for draft picks (room-scoped)
  useEffect(() => {
    if (!roomCode) return;
    const unsubscribe = base44.entities.RoomDraftPick.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["myPicks", user?.id, roomCode] });
      queryClient.invalidateQueries({ queryKey: ["allPicks", roomCode] });
    });
    return unsubscribe;
  }, [queryClient, roomCode, user?.id]);

  // Memoize rank calculation for performance using room-scoped brand states
  const myRank = useMemo(() => {
    // Create brand lookup map for O(1) access
    const brandMap = new Map(roomBrandStates.map(b => [b.id, b]));

    const userScores = {};
    allPicks.forEach(pick => {
      if (!userScores[pick.user_email]) userScores[pick.user_email] = 0;
      const brand = brandMap.get(pick.brand_id);
      if (brand?.aired) userScores[pick.user_email] += brand.points || 0;
    });

    const sortedUsers = Object.entries(userScores).sort((a, b) => b[1] - a[1]);
    return sortedUsers.findIndex(([email]) => email === user?.id) + 1;
  }, [allPicks, roomBrandStates, user?.id]);

  const categories = ["Tech", "Auto", "Food & Beverage", "Entertainment", "Other"];



  const playerIcon = "🏈"; // Get from player data
  const playerData = user ? {
    displayName: user.name?.replace(" ", "") || "Player",
    icon: playerIcon,
    rank: myRank,
    picks: myPicks,
  } : null;

  return (
    <div className="min-h-screen bg-[#1d1d0e] text-white pb-24">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black">My Drafted Lineup</h1>
        </div>

        {/* Status Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-[#4a4a3a]/40 to-[#3a3a2a]/40 border border-[#5a5a4a]/30 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <p className="text-white text-sm font-bold">LIVE • 2ND QUARTER</p>
              </div>
              <p className="text-[#a4a498] text-xs">Next Break: ~4 mins remaining</p>
              <div className="w-48 h-1 bg-[#5a5a4a]/30 rounded-full mt-2">
                <div className="w-3/4 h-full bg-[#f4c542] rounded-full" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[#a4a498] text-xs">Current Rank</p>
              <p className="text-white text-3xl font-black">
                {roomBrandStates.filter(b => b.aired).length > 0 ? `#${myRank || "-"}` : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {myPicks.length === 0 && !picksLoading && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-[#4a4a3a]/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📦</span>
            </div>
            <h3 className="text-xl font-bold mb-2">No Picks Yet</h3>
            <p className="text-[#a4a498] text-sm">Your drafted brands will appear here once you've made your selections!</p>
          </div>
        )}

        {/* Categories */}
        {categories.map(category => {
          const catPicks = myPicks.filter(p => p.category === category);
          if (catPicks.length === 0) return null;

          return (
            <div key={category} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg">{category}</h2>
                <span className="text-[#a4a498] text-sm">{catPicks.length} DRAFTED</span>
              </div>
              
              <div className="space-y-2">
                {picksLoading ? (
                  Array.from({ length: 2 }).map((_, idx) => <BrandCardSkeleton key={idx} />)
                ) : (
                  catPicks.map(pick => {
                    const brand = roomBrandStates.find(b => b.id === pick.brand_id);
                    if (!brand) return null;

                    const isAiring = brand.is_airing;
                    const isPending = !brand.aired && !brand.is_airing;

                    return (
                      <motion.div
                        key={pick.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-2xl border p-4 flex items-center gap-3 ${
                          isAiring
                            ? "bg-gradient-to-r from-[#f4c542]/20 to-[#d4a532]/20 border-[#f4c542] animate-pulse"
                            : "bg-[#2d2d1e] border-[#5a5a4a]/30"
                        }`}
                      >
                      <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center flex-shrink-0 p-2">
                        {failedImages.has(brand.id) ? (
                          <span className="font-bold text-gray-700 text-lg">{brand.brand_name?.[0]}</span>
                        ) : (
                          <img
                            src={brand.logo_url}
                            alt={brand.brand_name}
                            className="w-full h-full object-contain"
                            onError={() => handleImageError(brand.id)}
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white">{brand.brand_name}</p>
                        <p className="text-[#a4a498] text-sm">{brand.title}</p>
                      </div>
                      <div className="text-right">
                        {isAiring ? (
                          <>
                            <p className="text-[#f4c542] text-xs font-bold">AIRING NOW</p>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-white text-xs">LIVE</span>
                            </div>
                          </>
                        ) : isPending ? (
                          <>
                            <p className="text-[#a4a498] text-xs">PENDING</p>
                            <p className="text-[#6a6a5a] text-2xl font-black">0</p>
                            <p className="text-[#6a6a5a] text-xs">PTS</p>
                          </>
                        ) : (
                          <>
                            <p className="text-green-400 text-xs">AIRED</p>
                            <p className="text-white text-2xl font-black">{brand.points || 0}</p>
                            <p className="text-[#a4a498] text-xs">PTS</p>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <OnboardingTooltip
        show={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </div>
  );
}