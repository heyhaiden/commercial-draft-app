import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getUserIdentity } from "@/components/utils/guestAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Square, CheckCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BrandCardSkeleton, StatCardSkeleton } from "@/components/common/LoadingSkeleton";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [failedImages, setFailedImages] = useState(new Set());
  const [copied, setCopied] = useState(false);

  // Safe image error handler - no XSS
  const handleImageError = useCallback((brandId) => {
    setFailedImages(prev => new Set([...prev, brandId]));
  }, []);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    getUserIdentity(base44).then(identity => {
      setUser(identity);
    });
  }, []);

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list("brand_name", 100),
  });

  // Real-time sync for ratings
  useEffect(() => {
    const unsubscribe = base44.entities.Rating.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["allRatings"] });
    });
    return unsubscribe;
  }, [queryClient]);

  const { data: gameStates = [] } = useQuery({
    queryKey: ["gameState"],
    queryFn: () => base44.entities.GameState.list(),
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["gameRooms"],
    queryFn: () => base44.entities.GameRoom.list("-created_date", 1),
  });

  const currentRoomCode = rooms[0]?.room_code;

  const { data: roomBrandStates = [] } = useQuery({
    queryKey: ["roomBrandStates", currentRoomCode],
    queryFn: () => base44.entities.RoomBrandState.filter({ room_code: currentRoomCode }),
    enabled: !!currentRoomCode,
  });

  // Real-time sync for room brand state
  useEffect(() => {
    const unsubscribe = base44.entities.RoomBrandState.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["roomBrandStates"] });
    });
    return unsubscribe;
  }, [queryClient]);

  const { data: allPicks = [] } = useQuery({
    queryKey: ["allPicks"],
    queryFn: () => base44.entities.DraftPick.filter({ locked: true }),
  });

  const { data: allRatings = [] } = useQuery({
    queryKey: ["allRatings", currentRoomCode],
    queryFn: () => base44.entities.Rating.filter({ room_code: currentRoomCode }),
    enabled: !!currentRoomCode,
  });

  const gameState = gameStates[0];

  const updatePhaseMutation = useMutation({
    mutationFn: async (phase) => {
      if (gameState) {
        await base44.entities.GameState.update(gameState.id, { phase });
      } else {
        await base44.entities.GameState.create({ phase });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameState"] });
      toast.success("Game phase updated");
    },
  });

  const startDraftMutation = useMutation({
    mutationFn: async () => {
      const endsAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
      if (gameState) {
        await base44.entities.GameState.update(gameState.id, { phase: "drafting", draft_ends_at: endsAt });
      } else {
        await base44.entities.GameState.create({ phase: "drafting", draft_ends_at: endsAt });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameState"] });
      toast.success("Draft started! 2 minute timer running.");
    },
  });

  const airCommercialMutation = useMutation({
    mutationFn: async (brandId) => {
      // Stop any currently airing
      const currentlyAiring = roomBrandStates.filter(s => s.is_airing);
      for (const state of currentlyAiring) {
        // Calculate final average from ratings in current room only
        const brandRatings = await base44.entities.Rating.filter({ 
          brand_id: state.brand_id,
          room_code: currentRoomCode 
        });
        if (brandRatings.length > 0) {
          const totalStars = brandRatings.reduce((sum, r) => sum + r.stars, 0);
          const finalAvg = totalStars / brandRatings.length;
          const finalPoints = Math.round(finalAvg * 20) - 10;
          await base44.entities.RoomBrandState.update(state.id, {
            is_airing: false,
            aired: true,
            average_rating: Math.round(finalAvg * 100) / 100,
            total_ratings: brandRatings.length,
            points: finalPoints,
          });
        } else {
          await base44.entities.RoomBrandState.update(state.id, { is_airing: false, aired: true });
        }
      }
      // Start new one - create or update
      const existing = await base44.entities.RoomBrandState.filter({ 
        room_code: currentRoomCode, 
        brand_id: brandId 
      });
      const brand = brands.find(b => b.id === brandId);
      if (existing.length > 0) {
        await base44.entities.RoomBrandState.update(existing[0].id, {
          is_airing: true,
          aired: false,
          air_started_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.RoomBrandState.create({
          room_code: currentRoomCode,
          brand_id: brandId,
          brand_name: brand?.brand_name,
          is_airing: true,
          aired: false,
          air_started_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomBrandStates"] });
      toast.success("Commercial is now airing!");
    },
  });

  const stopAiringMutation = useMutation({
    mutationFn: async (brandId) => {
      // Calculate final average from ratings in current room only
      const brandRatings = await base44.entities.Rating.filter({ 
        brand_id: brandId,
        room_code: currentRoomCode 
      });
      const existing = await base44.entities.RoomBrandState.filter({ 
        room_code: currentRoomCode, 
        brand_id: brandId 
      });
      if (brandRatings.length > 0) {
        const totalStars = brandRatings.reduce((sum, r) => sum + r.stars, 0);
        const finalAvg = totalStars / brandRatings.length;
        const finalPoints = Math.round(finalAvg * 20) - 10;
        if (existing.length > 0) {
          await base44.entities.RoomBrandState.update(existing[0].id, {
            is_airing: false,
            aired: true,
            average_rating: Math.round(finalAvg * 100) / 100,
            total_ratings: brandRatings.length,
            points: finalPoints,
          });
        }
      } else {
        if (existing.length > 0) {
          await base44.entities.RoomBrandState.update(existing[0].id, { is_airing: false, aired: true });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomBrandStates"] });
      toast.success("Commercial stopped");
    },
  });

  const clearRatingsMutation = useMutation({
    mutationFn: async (brandId) => {
      const ratings = await base44.entities.Rating.filter({ 
        brand_id: brandId,
        room_code: currentRoomCode 
      });
      for (const rating of ratings) {
        await base44.entities.Rating.delete(rating.id);
      }
      const existing = await base44.entities.RoomBrandState.filter({ 
        room_code: currentRoomCode, 
        brand_id: brandId 
      });
      if (existing.length > 0) {
        await base44.entities.RoomBrandState.update(existing[0].id, {
          average_rating: 0,
          total_ratings: 0,
          points: 0,
          is_airing: false,
          aired: false,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomBrandStates"] });
      queryClient.invalidateQueries({ queryKey: ["allRatings"] });
      toast.success("Ratings cleared and ad reset");
    },
  });

  const closeGameMutation = useMutation({
    mutationFn: async () => {
      const currentRoom = rooms[0];
      if (!currentRoom) return;
      
      // Bulk delete all players and picks in parallel
      await Promise.all([
        base44.entities.Player.filter({ room_code: currentRoom.room_code })
          .then(players => Promise.all(players.map(p => base44.entities.Player.delete(p.id)))),
        base44.entities.RoomDraftPick.filter({ room_code: currentRoom.room_code })
          .then(picks => Promise.all(picks.map(p => base44.entities.RoomDraftPick.delete(p.id))))
      ]);
      
      // Delete the room
      await base44.entities.GameRoom.delete(currentRoom.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Game closed");
      navigate(-1);
    },
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ["allPlayers"],
    queryFn: () => base44.entities.Player.list("-created_date", 1000),
  });

  // Filter to current room only
  const currentRoomPlayers = allPlayers.filter(p => p.room_code === currentRoomCode);
  const uniqueUsers = currentRoomPlayers.length;

  const filteredBrands = brands.filter(b => {
    const state = roomBrandStates.find(s => s.brand_id === b.id);
    const matchesSearch = b.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         b.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || 
                         (filter === "aired" && state?.aired) ||
                         (filter === "pending" && !state?.aired && !state?.is_airing) ||
                         (filter === "airing" && state?.is_airing);
    return matchesSearch && matchesFilter;
  });

  const shareRoomCode = () => {
    if (rooms[0]?.room_code) {
      navigator.clipboard.writeText(rooms[0].room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#3d3d2e] text-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[#4a4a3a]/40 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-black text-white">Control Panel</h1>
          </div>
          {rooms[0] && (
            <button
              onClick={shareRoomCode}
              className="px-4 py-2 rounded-xl bg-[#4a4a3a]/40 hover:bg-[#5a5a4a]/40 text-[#f4c542] font-bold text-lg flex items-center gap-2"
            >
              <span className="text-2xl">{copied ? "Copied!" : rooms[0].room_code}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {brandsLoading ? (
            Array.from({ length: 3 }).map((_, idx) => <StatCardSkeleton key={idx} />)
          ) : (
            [
              { label: "Players", value: uniqueUsers },
              { label: "Aired", value: roomBrandStates.filter(s => s.aired).length },
              { label: "Left", value: brands.length - roomBrandStates.filter(s => s.aired || s.is_airing).length },
            ].map(({ label, value }) => (
              <div key={label} className="p-4 rounded-2xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30 text-center">
                <p className="text-3xl font-black text-[#f4c542]">{value}</p>
                <p className="text-[#a4a498] text-sm mt-1">{label}</p>
              </div>
            ))
          )}
        </div>



        {/* Commercial Air Control */}
        <div className="rounded-2xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30 p-4">
          <h2 className="font-bold text-lg mb-4">Commercial Control</h2>
          
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl bg-[#2d2d1e] border border-[#5a5a4a]/30 text-white placeholder-[#a4a498]"
            />
            <div className="flex gap-2">
              {["all", "pending", "aired", "airing"].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl font-medium text-sm capitalize transition-all ${
                    filter === f
                      ? "bg-gradient-to-r from-[#f4c542] to-[#d4a532] text-[#2d2d1e]"
                      : "bg-[#2d2d1e] text-[#a4a498] hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {brandsLoading ? (
              Array.from({ length: 5 }).map((_, idx) => <BrandCardSkeleton key={idx} />)
            ) : (
              filteredBrands.map(brand => {
                const state = roomBrandStates.find(s => s.brand_id === brand.id);
                return (
              <div key={brand.id} className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                state?.is_airing ? "bg-red-500/20 border-red-400/50" :
                state?.aired ? "bg-green-500/10 border-green-400/30 opacity-60" :
                "bg-[#2d2d1e] border-[#5a5a4a]/30"
              )}>
                <div className="w-10 h-10 rounded-xl bg-white/90 flex items-center justify-center overflow-hidden flex-shrink-0 p-2">
                  {failedImages.has(brand.id) ? (
                    <span className="text-xs font-bold text-gray-700">{brand.brand_name?.[0]}</span>
                  ) : (
                    <img
                      src={brand.logo_url}
                      alt={brand.brand_name}
                      className="w-full h-full object-contain"
                      onError={() => handleImageError(brand.id)}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{brand.brand_name}</p>
                  <p className="text-white/40 text-xs truncate">{brand.title}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                 {state?.aired && (
                   <div className="flex items-center gap-2">
                     <span className="text-xs text-white/40">⭐ {(state.average_rating || 0).toFixed(1)}</span>
                     <span className="text-xs text-[#f4c542]">({allRatings?.filter(r => r.brand_id === brand.id).length || 0}/{uniqueUsers})</span>
                   </div>
                 )}
                  {state?.is_airing ? (
                    <Button size="sm" variant="destructive" onClick={() => stopAiringMutation.mutate(brand.id)} className="rounded-lg">
                      <Square className="w-3 h-3 mr-1" /> Stop
                    </Button>
                  ) : !state?.aired ? (
                    <Button size="sm" onClick={() => airCommercialMutation.mutate(brand.id)} className="rounded-lg bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e]">
                      <Play className="w-3 h-3 mr-1" /> Air
                    </Button>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          if (confirm("Clear all ratings and reset this ad?")) {
                            clearRatingsMutation.mutate(brand.id);
                          }
                        }}
                        className="rounded-lg text-xs"
                      >
                        Rescore
                      </Button>
                    </>
                  )}
                </div>
                </div>
                );
                })
            )}
          </div>
        </div>

        {/* Quick Score Unrated Ads */}
        <div className="mt-6 mb-4">
          <Button
            onClick={async () => {
              // Find all unrated ads
              const unratedBrands = brands.filter(brand => {
                const state = roomBrandStates.find(s => s.brand_id === brand.id);
                return !state?.aired && !state?.is_airing;
              });

              if (unratedBrands.length === 0) {
                toast.info("All ads have been rated!");
                return;
              }

              // Stop any currently airing
              const airing = roomBrandStates.filter(s => s.is_airing);
              for (const state of airing) {
                await base44.entities.RoomBrandState.update(state.id, { is_airing: false, aired: true });
              }

              // Score only unrated brands with hardcoded values
              for (const brand of unratedBrands) {
                const ratings = [4, 3, 5]; // Hardcoded ratings
                for (let i = 0; i < ratings.length; i++) {
                  await base44.entities.Rating.create({
                    room_code: currentRoomCode,
                    user_email: `player_${i}@test.com`,
                    brand_id: brand.id,
                    brand_name: brand.brand_name,
                    stars: ratings[i],
                  });
                }

                const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                const points = Math.round(avgRating * 20) - 10;

                const existing = await base44.entities.RoomBrandState.filter({ 
                  room_code: currentRoomCode, 
                  brand_id: brand.id 
                });
                if (existing.length > 0) {
                  await base44.entities.RoomBrandState.update(existing[0].id, {
                    average_rating: Math.round(avgRating * 100) / 100,
                    total_ratings: 3,
                    points,
                    aired: true,
                    is_airing: false,
                  });
                } else {
                  await base44.entities.RoomBrandState.create({
                    room_code: currentRoomCode,
                    brand_id: brand.id,
                    brand_name: brand.brand_name,
                    average_rating: Math.round(avgRating * 100) / 100,
                    total_ratings: 3,
                    points,
                    aired: true,
                    is_airing: false,
                  });
                }
              }

              queryClient.invalidateQueries();
              toast.success(`✅ Scored ${unratedBrands.length} unrated ads!`);
            }}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-green-500/30 to-emerald-500/30 hover:from-green-500/40 hover:to-emerald-500/40 text-green-300 font-bold border border-green-400/30"
          >
            ⚡ Score All Unrated Ads
          </Button>
        </div>

        {/* Close Game Button */}
        <div className="mb-6">
          <Button
            onClick={() => {
              if (confirm("Are you sure you want to close this game? This will delete the room and all players.")) {
                closeGameMutation.mutate();
              }
            }}
            disabled={closeGameMutation.isPending || !rooms[0]}
            variant="destructive"
            className="w-full h-12 rounded-2xl"
          >
            {closeGameMutation.isPending ? "Closing..." : "Close Game"}
          </Button>
        </div>
      </div>
    </div>
  );
}