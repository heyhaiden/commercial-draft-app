import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Clock, CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RoomDraft() {
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get("code");
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
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
  const sortedPlayers = [...players].sort((a, b) => a.turn_order - b.turn_order);
  
  const pickedBrandIds = new Set(roomPicks.map(p => p.brand_id));
  const availableBrands = brands.filter(b => !pickedBrandIds.has(b.id));
  const filteredBrands = availableBrands.filter(b => 
    b.brand_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate current turn
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
  const isMyTurn = currentTurnPlayer?.user_email === user?.email;
  const isDraftComplete = roomPicks.length >= sortedPlayers.length * 5;

  useEffect(() => {
    if (isDraftComplete && room) {
      setTimeout(() => {
        navigate(createPageUrl("MyDraft"));
      }, 2000);
    }
  }, [isDraftComplete, room, navigate]);

  const lockPickMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBrand || !isMyTurn) return;

      const pickNumber = roomPicks.length + 1;
      const currentRound = Math.floor(pickNumber / sortedPlayers.length) + 1;

      await base44.entities.RoomDraftPick.create({
        room_code: roomCode,
        user_email: user.email,
        brand_id: selectedBrand.id,
        brand_name: selectedBrand.brand_name,
        pick_number: pickNumber,
        round: currentRound,
      });

      // Also create in global draft picks
      await base44.entities.DraftPick.create({
        user_email: user.email,
        user_name: user.full_name,
        brand_id: selectedBrand.id,
        brand_name: selectedBrand.brand_name,
        category: selectedBrand.category,
        locked: true,
      });

      setSelectedBrand(null);
      toast.success("Pick locked in!");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomPicks"] });
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

  return (
    <div className="min-h-screen bg-[#3d3d2e] text-white pb-24">
      <div className="max-w-md mx-auto">
        {/* Turn Banner */}
        <div className={cn(
          "p-4 border-b border-[#5a5a4a]/30",
          isMyTurn ? "bg-gradient-to-r from-[#f4c542]/20 to-[#d4a532]/20" : "bg-[#2d2d1e]"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center text-2xl flex-shrink-0">
              {currentTurnIcon}
            </div>
            <div className="flex-1">
              <p className="text-[#a4a498] text-xs">
                {isMyTurn ? "YOUR TURN" : "CURRENT PICK"}
              </p>
              <p className="font-black text-lg">{currentTurnPlayer.display_name}</p>
            </div>
            {room.round_timer && (
              <div className="text-center">
                <Clock className="w-5 h-5 text-[#f4c542] mx-auto mb-1" />
                <p className="text-xs text-[#a4a498]">0:{room.round_timer}</p>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#5a5a4a]/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a4a498]" />
            <input
              type="text"
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#2d2d1e] border border-[#5a5a4a]/30 text-white placeholder-[#a4a498] text-sm"
            />
          </div>
        </div>

        {/* Brands List */}
        <div className="p-4 space-y-2">
          {filteredBrands.map(brand => {
            const isSelected = selectedBrand?.id === brand.id;
            const isPicked = pickedBrandIds.has(brand.id);

            return (
              <button
                key={brand.id}
                onClick={() => isMyTurn && !isPicked && setSelectedBrand(brand)}
                disabled={!isMyTurn || isPicked}
                className={cn(
                  "w-full rounded-xl p-3 flex items-center gap-3 transition-all text-left",
                  isPicked && "opacity-30 cursor-not-allowed",
                  !isPicked && !isMyTurn && "opacity-60",
                  !isPicked && isMyTurn && "hover:bg-[#4a4a3a]/40",
                  isSelected && "bg-gradient-to-r from-[#f4c542]/20 to-[#d4a532]/20 border-2 border-[#f4c542]",
                  !isSelected && !isPicked && "bg-[#2d2d1e] border border-[#5a5a4a]/30"
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
                {isPicked && <Lock className="w-4 h-4 text-[#a4a498]" />}
              </button>
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