import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUserIdentity } from "@/components/utils/guestAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Clock, CheckCircle, Lock } from "lucide-react";
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    getUserIdentity(base44).then(setUser);
  }, []);

  const { data: rooms = [] } = useQuery({
    queryKey: ["room", roomCode],
    queryFn: () => base44.entities.GameRoom.filter({ room_code: roomCode }),
    enabled: !!roomCode,
    refetchInterval: 2000,
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players", roomCode],
    queryFn: () => base44.entities.Player.filter({ room_code: roomCode }),
    enabled: !!roomCode,
    refetchInterval: 2000,
  });

  const { data: roomPicks = [] } = useQuery({
    queryKey: ["roomPicks", roomCode],
    queryFn: () => base44.entities.RoomDraftPick.filter({ room_code: roomCode }),
    enabled: !!roomCode,
    refetchInterval: 2000,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list("brand_name", 100),
  });

  const room = rooms[0];
  // Filter out the host from players
  const gamePlayers = players.filter(p => room && p.user_email !== room.host_email);
  const sortedPlayers = [...gamePlayers].sort((a, b) => a.turn_order - b.turn_order);
  
  const pickedBrandIds = new Set(roomPicks.map(p => p.brand_id));
  const myPickedBrands = roomPicks.filter(p => p.user_email === user?.id).map(p => p.brand_id);
  const availableBrands = brands.filter(b => !pickedBrandIds.has(b.id));
  const filteredBrands = availableBrands.filter(b => 
    searchTerm === "" || b.category === searchTerm
  );

  // Calculate current turn
  const [timeRemaining, setTimeRemaining] = useState(null);

  const getCurrentTurnPlayer = () => {
    if (!room || !sortedPlayers.length) return null;
    
    const totalPicks = roomPicks.length;
    const playersCount = sortedPlayers.length;
    const currentRound = Math.floor(totalPicks / playersCount) + 1;
    const pickInRound = totalPicks % playersCount;
    
    // Snake draft logic
    const isReverse = room.snake_draft && currentRound % 2 === 0;
    const turnIndex = isReverse ? playersCount - 1 - pickInRound : pickInRound;
    
    return sortedPlayers[turnIndex];
  };

  const currentTurnPlayer = getCurrentTurnPlayer();
  const isMyTurn = currentTurnPlayer?.user_email === user?.id;
  const isDraftComplete = roomPicks.length >= sortedPlayers.length * 5;

  useEffect(() => {
    if (isDraftComplete && room) {
      setTimeout(() => {
        navigate(createPageUrl("MyDraft"));
      }, 2000);
    }
  }, [isDraftComplete, room, navigate]);

  // Timer countdown
  useEffect(() => {
    if (!room || !currentTurnPlayer || isDraftComplete) return;

    const interval = setInterval(() => {
      const turnStartTime = new Date(room.turn_started_at || room.draft_starts_at).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - turnStartTime) / 1000);
      const remaining = Math.max(0, room.round_timer - elapsed);
      
      setTimeRemaining(remaining);

      if (remaining === 0 && isMyTurn) {
        // Auto-pick a random brand if time runs out
        if (availableBrands.length > 0 && !lockPickMutation.isPending) {
          const randomBrand = availableBrands[Math.floor(Math.random() * availableBrands.length)];
          setSelectedBrand(randomBrand);
          setTimeout(() => {
            lockPickMutation.mutate(randomBrand);
          }, 100);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room, currentTurnPlayer, isDraftComplete, isMyTurn, availableBrands]);

  const lockPickMutation = useMutation({
    mutationFn: async (brand) => {
      const brandToPick = brand || selectedBrand;
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
        {/* Draft Order Header */}
        <div className="bg-[#2d2d1e] border-b border-[#5a5a4a]/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold">Draft Order</h2>
            <span className="text-[#a4a498] text-sm">Round {currentRound}/5</span>
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

        {/* Turn Banner */}
        <div className={cn(
          "p-4 border-b border-[#5a5a4a]/30",
          isMyTurn ? "bg-gradient-to-r from-[#f4c542]/20 to-[#d4a532]/20" : "bg-[#2d2d1e]"
        )}>
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
            {room.round_timer && (
              <div className="text-center">
                <Clock className="w-5 h-5 text-[#f4c542] mx-auto mb-1" />
                <p className={`text-xs font-bold ${timeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-[#a4a498]'}`}>
                  {timeRemaining !== null ? `0:${String(timeRemaining).padStart(2, '0')}` : `0:${room.round_timer}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="p-4 border-b border-[#5a5a4a]/30">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["All Brands", "Tech", "Auto", "Food & Beverage", "Entertainment", "Other"].map(cat => (
              <button
                key={cat}
                onClick={() => setSearchTerm(cat === "All Brands" ? "" : cat)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-full font-medium text-sm transition-all",
                  (cat === "All Brands" && searchTerm === "") || searchTerm === cat
                    ? "bg-gradient-to-r from-[#f4c542] to-[#d4a532] text-[#2d2d1e]"
                    : "bg-[#2d2d1e] text-[#a4a498] hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Brands List */}
        <div className="p-4 space-y-2 pb-24">
          {filteredBrands.map(brand => {
            const isSelected = selectedBrand?.id === brand.id;
            const isPicked = pickedBrandIds.has(brand.id);
            const isMine = myPickedBrands.includes(brand.id);

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
                  isPicked && !isMine && "opacity-30 cursor-not-allowed",
                  !isPicked && !isMyTurn && "opacity-60",
                  !isPicked && isMyTurn && "hover:bg-[#4a4a3a]/40",
                  isSelected && "bg-gradient-to-r from-[#f4c542]/20 to-[#d4a532]/20 border-2 border-[#f4c542]",
                  !isSelected && !isPicked && !isMine && "bg-[#2d2d1e] border border-[#5a5a4a]/30"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-2 flex-shrink-0">
                  <img
                    src={brand.logo_url}
                    alt={brand.brand_name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.parentElement.innerHTML = `<span class="font-bold text-gray-700 text-lg">${brand.brand_name?.[0]}</span>`;
                    }}
                  />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{brand.brand_name}</p>
                  <p className="text-xs text-[#a4a498]">{brand.category}</p>
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