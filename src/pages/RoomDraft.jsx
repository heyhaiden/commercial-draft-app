import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUserIdentity } from "@/components/utils/guestAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function RoomDraft() {
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get("code");
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [failedImages, setFailedImages] = useState(new Set());

  // Safe image error handler - no innerHTML XSS vulnerability
  const handleImageError = useCallback((brandId) => {
    setFailedImages(prev => new Set([...prev, brandId]));
  }, []);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    getUserIdentity(base44).then(setUser);
  }, []);

  const { data: rooms = [] } = useQuery({
    queryKey: ["room", roomCode],
    queryFn: () => base44.entities.GameRoom.filter({ room_code: roomCode }),
    enabled: !!roomCode,
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players", roomCode],
    queryFn: () => base44.entities.Player.filter({ room_code: roomCode }),
    enabled: !!roomCode,
  });

  const { data: roomPicks = [] } = useQuery({
    queryKey: ["roomPicks", roomCode],
    queryFn: () => base44.entities.RoomDraftPick.filter({ room_code: roomCode }),
    enabled: !!roomCode,
  });

  // Real-time sync for room updates
  useEffect(() => {
    if (!roomCode) return;
    const unsubscribe = base44.entities.GameRoom.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["room", roomCode] });
    });
    return unsubscribe;
  }, [roomCode, queryClient]);

  // Real-time sync for player updates
  useEffect(() => {
    if (!roomCode) return;
    const unsubscribe = base44.entities.Player.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["players", roomCode] });
    });
    return unsubscribe;
  }, [roomCode, queryClient]);

  // Real-time sync for draft picks
  useEffect(() => {
    if (!roomCode) return;
    const unsubscribe = base44.entities.RoomDraftPick.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["roomPicks", roomCode] });
    });
    return unsubscribe;
  }, [roomCode, queryClient]);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list("brand_name", 100),
  });

  const room = rooms[0];
  const isHost = user && room && user.id === room.host_email;

  // Memoize expensive calculations
  const sortedPlayers = useMemo(() => {
    if (!room) return [];
    const gamePlayers = players.filter(p => p.user_email !== room.host_email);
    return [...gamePlayers].sort((a, b) => a.turn_order - b.turn_order);
  }, [players, room]);

  const pickedBrandIds = useMemo(() => new Set(roomPicks.map(p => p.brand_id)), [roomPicks]);
  const myPickedBrandIds = useMemo(() => new Set(
    roomPicks.filter(p => p.user_email === user?.id).map(p => p.brand_id)
  ), [roomPicks, user?.id]);

  const filteredBrands = useMemo(() => {
    const available = brands.filter(b => !pickedBrandIds.has(b.id));
    if (searchTerm === "" || searchTerm === "All Brands") return available;
    return available.filter(b => b.category === searchTerm);
  }, [brands, pickedBrandIds, searchTerm]);

  // Calculate current turn
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Memoize current turn calculation
  const currentTurnPlayer = useMemo(() => {
    if (!room || !sortedPlayers.length) return null;

    const totalPicks = roomPicks.length;
    const playersCount = sortedPlayers.length;
    const currentRound = Math.floor(totalPicks / playersCount) + 1;
    const pickInRound = totalPicks % playersCount;

    // Snake draft logic
    const isReverse = room.snake_draft && currentRound % 2 === 0;
    const turnIndex = isReverse ? playersCount - 1 - pickInRound : pickInRound;

    return sortedPlayers[turnIndex];
  }, [room, sortedPlayers, roomPicks.length]);
  const isMyTurn = currentTurnPlayer?.user_email === user?.id;
  
  // Draft complete when ALL players have 5 picks
  const isDraftComplete = sortedPlayers.every(player => {
    const playerPicks = roomPicks.filter(p => p.user_email === player.user_email).length;
    return playerPicks >= 5;
  });

  useEffect(() => {
    if (isDraftComplete && room && user) {
      setTimeout(() => {
        if (isHost) {
          navigate(createPageUrl("Admin"));
        } else {
          navigate(createPageUrl("MyDraft"));
        }
      }, 2000);
    }
  }, [isDraftComplete, room, navigate, isHost, user]);

  // Timer countdown
  useEffect(() => {
    if (!room || !currentTurnPlayer || isDraftComplete) return;

    const interval = setInterval(() => {
      const turnStartTime = new Date(room.turn_started_at || room.draft_starts_at).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - turnStartTime) / 1000);
      const remaining = Math.max(0, room.round_timer - elapsed);
      
      setTimeRemaining(remaining);

      if (remaining === 0 && isMyTurn && !lockPickMutation.isPending) {
        // Skip turn by advancing timer without picking
        skipTurnMutation.mutate();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room, currentTurnPlayer, isDraftComplete, isMyTurn]);

  const skipTurnMutation = useMutation({
    mutationFn: async () => {
      // Just advance the turn timer without picking
      await base44.entities.GameRoom.update(room.id, {
        turn_started_at: new Date().toISOString(),
      });
      toast.error("⏱️ Time expired - turn skipped");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room"] });
    },
  });

  const lockPickMutation = useMutation({
    mutationFn: async (brand = null) => {
      const brandToPick = brand ?? selectedBrand;
      if (!brandToPick) return;
      
      // Visual feedback animation
      toast.success(`🎯 ${brandToPick.brand_name} locked in!`);

      const pickNumber = roomPicks.length + 1;
      const currentRound = Math.floor(pickNumber / sortedPlayers.length) + 1;

      await base44.entities.RoomDraftPick.create({
        room_code: roomCode,
        user_email: user.id,
        brand_id: brandToPick.id,
        brand_name: brandToPick.brand_name,
        pick_number: pickNumber,
        round: currentRound,
      });

      await base44.entities.DraftPick.create({
        user_email: user.id,
        user_name: user.name,
        brand_id: brandToPick.id,
        brand_name: brandToPick.brand_name,
        category: brandToPick.category,
        locked: true,
      });

      // Update turn timer
      await base44.entities.GameRoom.update(room.id, {
        turn_started_at: new Date().toISOString(),
      });

      setSelectedBrand(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomPicks"] });
      queryClient.invalidateQueries({ queryKey: ["room"] });
    },
  });

  if (isDraftComplete) {
    return (
      <div className="min-h-screen bg-[#3d3d2e] text-white flex items-center justify-center px-6">
        <div className="text-center">
          <CheckCircle className="w-20 h-20 text-[#f4c542] mx-auto mb-4" />
          <h1 className="text-3xl font-black mb-2">DRAFT COMPLETE!</h1>
          <p className="text-[#a4a498]">Redirecting to your lineup...</p>
        </div>
      </div>
    );
  }

  if (!room || !currentTurnPlayer) return null;

  const currentTurnIcon = currentTurnPlayer.icon ? 
    ["🏈", "🏆", "⭐", "🔥", "⚡", "👑"][parseInt(currentTurnPlayer.icon.replace("icon", "")) - 1] : "👤";

  const ICONS = ["🏈", "🏆", "⭐", "🔥", "⚡", "👑"];
  const getPlayerIcon = (player) => {
    if (!player?.icon) return "👤";
    const iconIndex = parseInt(player.icon.replace("icon", "")) - 1;
    return ICONS[iconIndex] || "👤";
  };

  const totalPicks = roomPicks.length;
  const playersCount = sortedPlayers.length;
  const currentRound = Math.floor(totalPicks / playersCount) + 1;

  return (
    <div className="min-h-screen bg-[#3d3d2e] text-white">
      <div className="max-w-md mx-auto">
        {/* Draft Order Header - Admin Only */}
        {isHost && (
          <div className="bg-[#2d2d1e] border-b border-[#5a5a4a]/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-bold">Draft Order</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (confirm("Force advance to next turn?")) {
                      base44.entities.GameRoom.update(room.id, {
                        turn_started_at: new Date().toISOString(),
                      }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ["room"] });
                        toast.success("Turn advanced");
                      });
                    }
                  }}
                  className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30"
                >
                  Unstuck
                </button>
                <span className="text-[#a4a498] text-sm">Round {currentRound}/5</span>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-2">
              {sortedPlayers.map((player, idx) => {
                const isCurrent = currentTurnPlayer?.user_email === player.user_email;
                const playerPicks = roomPicks.filter(p => p.user_email === player.user_email).length;
                const hasCompleted = playerPicks >= 5;
                
                return (
                  <div
                    key={player.id}
                    className={cn(
                      "flex-shrink-0 w-16 rounded-xl p-2 text-center transition-all",
                      isCurrent && "bg-gradient-to-br from-[#f4c542]/30 to-[#d4a532]/30 border-2 border-[#f4c542]",
                      !isCurrent && hasCompleted && "opacity-40",
                      !isCurrent && !hasCompleted && "bg-[#3d3d2e]"
                    )}
                  >
                    <div className={cn(
                      "text-2xl mb-1",
                      isCurrent && "animate-bounce"
                    )}>
                      {getPlayerIcon(player)}
                    </div>
                    <p className="text-[10px] text-white font-bold truncate">{player.display_name}</p>
                    <p className="text-[9px] text-[#a4a498]">{playerPicks}/5</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Turn Banner - Sticky */}
        <div className={cn(
          "sticky top-0 z-10 p-4 border-b border-[#5a5a4a]/30",
          isMyTurn ? "bg-gradient-to-r from-[#f4c542]/20 to-[#d4a532]/20" : "bg-[#2d2d1e]"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center text-2xl flex-shrink-0 relative">
                {currentTurnIcon}
                {isMyTurn && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-[#2d2d1e] animate-pulse" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-[#a4a498] text-xs font-bold">
                  {isMyTurn ? "🎯 YOUR TURN" : "CURRENT PICK"}
                </p>
                <p className="font-black text-lg">{currentTurnPlayer.display_name}</p>
              </div>
            </div>
            {room.round_timer && (
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-[#5a5a4a]/30"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - (timeRemaining || 0) / room.round_timer)}`}
                    className={`transition-all duration-1000 ${timeRemaining <= 10 ? 'text-red-400' : 'text-[#f4c542]'}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className={`text-lg font-black ${timeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                    {timeRemaining !== null ? timeRemaining : room.round_timer}
                  </p>
                </div>
              </div>
            )}
          </div>
          {/* My Picks Count */}
          <div className="text-center">
            <p className="text-[#a4a498] text-xs">My Picks: {myPickedBrandIds.size}/5</p>
          </div>
        </div>



        {/* Category Filter */}
        <div className="p-4 border-b border-[#5a5a4a]/30">
          <h3 className="text-xs font-bold text-[#a4a498] mb-2 uppercase tracking-wider">Filter by Category</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { name: "All Brands", emoji: "📦" },
              { name: "Tech", emoji: "💻" },
              { name: "Auto", emoji: "🚗" },
              { name: "Food & Beverage", emoji: "🍔" },
              { name: "Entertainment", emoji: "🎬" },
              { name: "Other", emoji: "✨" }
            ].map(({ name, emoji }) => (
              <button
                key={name}
                onClick={() => setSearchTerm(name === "All Brands" ? "" : name)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-full font-medium text-sm transition-all flex items-center gap-2",
                  (name === "All Brands" && searchTerm === "") || searchTerm === name
                    ? "bg-gradient-to-r from-[#f4c542] to-[#d4a532] text-[#2d2d1e]"
                    : "bg-[#2d2d1e] text-[#a4a498] hover:text-white"
                )}
              >
                <span>{emoji}</span>
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Brands List */}
        <div className="p-4 space-y-2 pb-24">
          {brands.map(brand => {
            const isSelected = selectedBrand?.id === brand.id;
            const isPicked = pickedBrandIds.has(brand.id);
            const isMine = myPickedBrandIds.has(brand.id);
            const pickedByPlayer = roomPicks.find(p => p.brand_id === brand.id);
            const pickedPlayer = pickedByPlayer ? players.find(p => p.user_email === pickedByPlayer.user_email) : null;
            const showBrand = !isPicked || searchTerm === "" || brand.category === searchTerm;

            if (!showBrand) return null;

            return (
              <motion.button
                key={brand.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={isMyTurn && !isPicked ? { scale: 0.98 } : {}}
                onClick={() => isMyTurn && !isPicked && setSelectedBrand(brand)}
                disabled={!isMyTurn || isPicked}
                className={cn(
                  "w-full rounded-xl p-3 flex items-center gap-3 transition-all text-left",
                  isMine && "bg-green-500/20 border-2 border-green-400",
                  isPicked && !isMine && "opacity-50 bg-[#2d2d1e]/50 cursor-not-allowed border border-[#5a5a4a]/20",
                  !isPicked && !isMyTurn && "opacity-60",
                  !isPicked && isMyTurn && "hover:bg-[#4a4a3a]/40",
                  isSelected && "bg-gradient-to-r from-[#f4c542]/20 to-[#d4a532]/20 border-2 border-[#f4c542]",
                  !isSelected && !isPicked && !isMine && "bg-[#2d2d1e] border border-[#5a5a4a]/30"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-2 flex-shrink-0">
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
                  <p className="text-xs text-[#a4a498]">{brand.title}</p>
                  {isPicked && pickedPlayer && (
                    <p className="text-[10px] text-[#f4c542] mt-1">
                      {getPlayerIcon(pickedPlayer)} {pickedPlayer.display_name}
                    </p>
                  )}
                </div>
                {isMine && <CheckCircle className="w-5 h-5 text-green-400" />}
                {isPicked && !isMine && <Lock className="w-4 h-4 text-[#a4a498]" />}
              </motion.button>
            );
          })}
        </div>

        {/* Lock Button */}
        {isMyTurn && selectedBrand && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#3d3d2e] border-t border-[#5a5a4a]/30">
            <Button
              onClick={() => lockPickMutation.mutate()}
              disabled={lockPickMutation.isPending}
              className="w-full h-14 rounded-[24px] bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold text-lg"
            >
              <Lock className="w-5 h-5 mr-2" />
              LOCK IN {selectedBrand.brand_name}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}