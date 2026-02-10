import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { getUserIdentity, getCurrentRoomCode } from "@/components/utils/guestAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Square, CheckCircle, ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BrandCardSkeleton, StatCardSkeleton } from "@/components/common/LoadingSkeleton";
import { getRoomBrandStates } from "@/components/utils/brandState";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [failedImages, setFailedImages] = useState(new Set());
  const [codeCopied, setCodeCopied] = useState(false);
  const roomCode = getCurrentRoomCode();

  // Safe image error handler - no XSS
  const handleImageError = useCallback((brandId) => {
    setFailedImages(prev => new Set([...prev, brandId]));
  }, []);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    getUserIdentity(base44).then(identity => {
      setUser(identity);
    }).catch((error) => {
      // Silently handle errors - getUserIdentity already handles fallback
      // Don't log 401/403 errors as they're expected for guest users
      if (error?.status !== 401 && error?.status !== 403) {
        console.error('Failed to get user identity:', error);
      }
    });
  }, []);

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list("brand_name", 100),
  });

  // Real-time sync for brand updates
  useEffect(() => {
    const unsubscribe = base44.entities.Brand.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    });
    return unsubscribe;
  }, [queryClient]);

  // Real-time sync for ratings
  useEffect(() => {
    if (!roomCode) return;
    const unsubscribe = base44.entities.Rating.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["allRatings", roomCode] });
    });
    return unsubscribe;
  }, [queryClient, roomCode]);

  const { data: gameStates = [] } = useQuery({
    queryKey: ["gameState"],
    queryFn: () => base44.entities.GameState.list(),
  });

  // Get current room
  const { data: rooms = [] } = useQuery({
    queryKey: ["room", roomCode],
    queryFn: () => base44.entities.GameRoom.filter({ room_code: roomCode }),
    enabled: !!roomCode,
  });
  const currentRoom = rooms[0];

  // Room-scoped picks
  const { data: allPicks = [] } = useQuery({
    queryKey: ["allPicks", roomCode],
    queryFn: () => base44.entities.RoomDraftPick.filter({ room_code: roomCode }),
    enabled: !!roomCode,
  });

  // Room-scoped ratings (filter by user_email prefix)
  const { data: allRatings = [] } = useQuery({
    queryKey: ["allRatings", roomCode],
    queryFn: async () => {
      const ratings = await base44.entities.Rating.list("-created_date", 500);
      // Filter to only ratings from this room (user_email starts with roomCode:)
      return ratings.filter(r => r.user_email?.startsWith(`${roomCode}:`));
    },
    enabled: !!roomCode,
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
    onError: (error) => {
      toast.error(error.message || "Failed to update game phase");
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
    onError: (error) => {
      toast.error(error.message || "Failed to start draft");
    },
  });

  const airCommercialMutation = useMutation({
    mutationFn: async (brandId) => {
      if (!currentRoom || !roomCode) {
        toast.error("No room found");
        return;
      }
      
      // Start new one - store in GameRoom (room-scoped)
      await base44.entities.GameRoom.update(currentRoom.id, {
        current_airing_brand_id: brandId,
        air_started_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room", roomCode] });
      toast.success("Commercial is now airing!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start commercial");
    },
  });

  const stopAiringMutation = useMutation({
    mutationFn: async (brandId) => {
      if (!currentRoom || !roomCode) {
        toast.error("No room found");
        return;
      }
      
      // Stop airing - clear from GameRoom (room-scoped)
      await base44.entities.GameRoom.update(currentRoom.id, {
        current_airing_brand_id: null,
        air_started_at: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room", roomCode] });
      toast.success("Commercial stopped");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to stop commercial");
    },
  });

  const clearRatingsMutation = useMutation({
    mutationFn: async (brandId) => {
      if (!roomCode) {
        toast.error("No room code found");
        return;
      }
      
      // Delete only room-scoped ratings for this brand
      const allRatings = await base44.entities.Rating.filter({ brand_id: brandId });
      const roomRatings = allRatings.filter(r => r.user_email?.startsWith(`${roomCode}:`));
      for (const rating of roomRatings) {
        await base44.entities.Rating.delete(rating.id);
      }
      
      // If this brand is currently airing in this room, stop it
      if (currentRoom?.current_airing_brand_id === brandId) {
        await base44.entities.GameRoom.update(currentRoom.id, {
          current_airing_brand_id: null,
          air_started_at: null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allRatings", roomCode] });
      queryClient.invalidateQueries({ queryKey: ["room", roomCode] });
      toast.success("Ratings cleared and ad reset for this room");
    },
  });

  const closeGameMutation = useMutation({
    mutationFn: async () => {
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
    onError: (error) => {
      toast.error(error.message || "Failed to close game");
    },
  });

  // Get players for current room only (optimized - server-side filter)
  const { data: currentRoomPlayers = [] } = useQuery({
    queryKey: ["allPlayers", roomCode],
    queryFn: () => base44.entities.Player.filter({ room_code: roomCode }),
    enabled: !!roomCode,
  });
  const uniqueUsers = currentRoomPlayers.length;

  // Calculate room-scoped brand states
  const roomBrandStates = useMemo(() => {
    if (!roomCode || !currentRoom) return brands;
    return getRoomBrandStates(brands, allRatings, roomCode, currentRoom);
  }, [brands, allRatings, roomCode, currentRoom]);

  const filteredBrands = roomBrandStates.filter(b => {
    const matchesSearch = b.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         b.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || 
                         (filter === "aired" && b.aired) ||
                         (filter === "pending" && !b.aired && !b.is_airing) ||
                         (filter === "airing" && b.is_airing);
    return matchesSearch && matchesFilter;
  });

  const shareRoomCode = () => {
    if (currentRoom?.room_code) {
      navigator.clipboard.writeText(currentRoom.room_code);
      setCodeCopied(true);
      toast.success("Room code copied to clipboard!");
      setTimeout(() => setCodeCopied(false), 2000);
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
          {currentRoom && (
            <button
              onClick={shareRoomCode}
              className={`px-4 py-2 rounded-xl font-bold text-lg flex items-center gap-2 transition-all ${
                codeCopied
                  ? "bg-green-500/30 text-green-300 border border-green-500/50"
                  : "bg-[#4a4a3a]/40 hover:bg-[#5a5a4a]/40 text-[#f4c542]"
              }`}
            >
              <span className="text-2xl">{codeCopied ? "Copied!" : currentRoom.room_code}</span>
              {codeCopied ? (
                <Check className="w-5 h-5" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
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
              { label: "Aired", value: roomBrandStates.filter(b => b.aired).length },
              { label: "Left", value: roomBrandStates.filter(b => !b.aired && !b.is_airing).length },
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
              filteredBrands.map(brand => (
              <div key={brand.id} className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                brand.is_airing ? "bg-red-500/20 border-red-400/50" :
                brand.aired ? "bg-green-500/10 border-green-400/30 opacity-60" :
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
                 {brand.aired && (
                   <div className="flex items-center gap-2">
                     <span className="text-xs text-white/40">⭐ {(brand.average_rating || 0).toFixed(1)}</span>
                     <span className="text-xs text-[#f4c542]">({allRatings.filter(r => r.brand_id === brand.id).length}/{uniqueUsers})</span>
                   </div>
                 )}
                  {brand.is_airing ? (
                    <Button size="sm" variant="destructive" onClick={() => stopAiringMutation.mutate(brand.id)} className="rounded-lg">
                      <Square className="w-3 h-3 mr-1" /> Stop
                    </Button>
                  ) : !brand.aired ? (
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
              ))
            )}
          </div>
        </div>

        {/* Scoring Simulation - Room-Scoped */}
        <div className="rounded-2xl bg-blue-500/20 border border-blue-400/30 p-4 mb-4 mt-6">
          <h3 className="font-bold text-sm mb-2 text-blue-400">Test Scoring & Complete Game</h3>
          <Button
            onClick={async () => {
              if (!roomCode) {
                toast.error("No room code found");
                return;
              }

              if (!currentRoom) {
                toast.error("No room found");
                return;
              }

              // 1. Stop any airing brand in this room
              if (currentRoom.current_airing_brand_id) {
                await base44.entities.GameRoom.update(currentRoom.id, {
                  current_airing_brand_id: null,
                  air_started_at: null,
                });
              }

              // 2. Generate random scores for all brands using room-scoped ratings
              const allBrands = [...brands];
              for (const brand of allBrands) {
                // Clear existing ratings for this brand in this room only
                const existingRatings = await base44.entities.Rating.filter({ brand_id: brand.id });
                const roomRatings = existingRatings.filter(r => r.user_email?.startsWith(`${roomCode}:`));
                for (const r of roomRatings) {
                  await base44.entities.Rating.delete(r.id);
                }

                // Create ratings for each player in this room
                for (let i = 0; i < currentRoomPlayers.length; i++) {
                  const player = currentRoomPlayers[i];
                  const stars = Math.floor(Math.random() * 5) + 1;
                  // Use room-scoped user ID format
                  await base44.entities.Rating.create({
                    user_email: `${roomCode}:${player.user_email}`,
                    brand_id: brand.id,
                    brand_name: brand.brand_name,
                    stars,
                  });
                }
              }

              queryClient.invalidateQueries();
              toast.success("🎉 Game completed! All brands scored for this room.");

              // Navigate to leaderboard after a delay
              setTimeout(() => {
                navigate(createPageUrl("Leaderboard"));
              }, 2000);
            }}
            className="w-full h-10 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm"
          >
            🎲 Complete Game with Random Scores
          </Button>
        </div>

        {/* Clear Room Data - Room-Scoped Only */}
        <div className="rounded-2xl bg-orange-500/20 border border-orange-400/30 p-4 mb-4">
          <h3 className="font-bold text-sm mb-2 text-orange-400">Clear This Room's Data</h3>
          <p className="text-xs text-orange-300/70 mb-3">Clear all ratings and airing state for THIS ROOM ONLY (does not affect other rooms)</p>
          <Button
            onClick={async () => {
              if (!roomCode || !currentRoom) {
                toast.error("No room found");
                return;
              }
              
              if (!confirm(`Clear all data for room ${roomCode}? This will delete all ratings and reset airing state for this room only.`)) return;

              toast.loading("Clearing room data...");

              // Clear airing state for this room
              await base44.entities.GameRoom.update(currentRoom.id, {
                current_airing_brand_id: null,
                air_started_at: null,
              });

              // Delete only ratings from this room
              const allRatings = await base44.entities.Rating.list("-created_date", 1000);
              const roomRatings = allRatings.filter(r => r.user_email?.startsWith(`${roomCode}:`));
              for (const r of roomRatings) {
                await base44.entities.Rating.delete(r.id);
              }

              queryClient.invalidateQueries();
              toast.dismiss();
              toast.success(`✨ Room ${roomCode} data cleared! Other rooms unaffected.`);
            }}
            className="w-full h-10 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-sm"
          >
            🗑️ Clear This Room's Data Only
          </Button>
        </div>

        {/* Close Game Button */}
        <div className="mt-6 mb-6">
          <Button
            onClick={() => {
              if (confirm("Are you sure you want to close this game? This will delete the room and all players.")) {
                closeGameMutation.mutate();
              }
            }}
            disabled={closeGameMutation.isPending || !currentRoom}
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