import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getUserIdentity, getCurrentRoomCode } from "@/components/utils/guestAuth";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const ICONS = [
  { id: "icon1", emoji: "🏈" },
  { id: "icon2", emoji: "🏆" },
  { id: "icon3", emoji: "⭐" },
  { id: "icon4", emoji: "🔥" },
  { id: "icon5", emoji: "⚡" },
  { id: "icon6", emoji: "👑" },
];

export default function DraftRecap() {
  const [user, setUser] = useState(null);
  const [failedImages, setFailedImages] = useState(new Set());
  const roomCode = getCurrentRoomCode();
  const navigate = useNavigate();

  const handleImageError = useCallback((brandId) => {
    setFailedImages((prev) => new Set([...prev, brandId]));
  }, []);

  useEffect(() => {
    getUserIdentity(base44).then(setUser);
  }, []);

  const { data: picks = [] } = useQuery({
    queryKey: ["draftRecap", roomCode],
    queryFn: () =>
      base44.entities.RoomDraftPick.filter({ room_code: roomCode }),
    enabled: !!roomCode,
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players", roomCode],
    queryFn: () => base44.entities.Player.filter({ room_code: roomCode }),
    enabled: !!roomCode,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list(),
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["room", roomCode],
    queryFn: () => base44.entities.GameRoom.filter({ room_code: roomCode }),
    enabled: !!roomCode,
  });

  const room = rooms[0];

  const playerMap = useMemo(
    () => new Map(players.map((p) => [p.user_email, p])),
    [players]
  );

  const brandMap = useMemo(
    () => new Map(brands.map((b) => [b.id, b])),
    [brands]
  );

  const getPlayerIcon = (player) => {
    if (!player?.icon) return "👤";
    return ICONS.find((i) => i.id === player.icon)?.emoji || "👤";
  };

  const rounds = useMemo(() => {
    const sorted = [...picks].sort((a, b) => a.pick_number - b.pick_number);
    const grouped = {};
    sorted.forEach((pick) => {
      const round = pick.round || 1;
      if (!grouped[round]) grouped[round] = [];
      grouped[round].push(pick);
    });
    return grouped;
  }, [picks]);

  if (!roomCode) {
    return (
      <div className="min-h-screen bg-[#1d1d0e] text-white flex items-center justify-center">
        <p className="text-[#a4a498]">No active game found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1d1d0e] text-white pb-24">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-[#4a4a3a]/40 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black">DRAFT RECAP</h1>
            <p className="text-[#a4a498] text-xs">
              {picks.length} picks
              {room?.snake_draft ? " • Snake Draft" : ""} • Room {roomCode}
            </p>
          </div>
        </div>

        {picks.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-[#4a4a3a]/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📋</span>
            </div>
            <h3 className="text-xl font-bold mb-2">No Picks Yet</h3>
            <p className="text-[#a4a498] text-sm">
              Draft picks will appear here once the draft begins.
            </p>
          </div>
        )}

        {Object.entries(rounds).map(([roundNum, roundPicks]) => (
          <div key={roundNum} className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center">
                <span className="text-[#2d2d1e] text-sm font-black">
                  {roundNum}
                </span>
              </div>
              <h2 className="font-bold text-lg">Round {roundNum}</h2>
              <div className="flex-1 h-px bg-[#5a5a4a]/30" />
            </div>

            <div className="space-y-2 ml-4 border-l-2 border-[#5a5a4a]/20 pl-4">
              {roundPicks.map((pick, idx) => {
                const player = playerMap.get(pick.user_email);
                const brand = brandMap.get(pick.brand_id);
                const isMe = pick.user_email === user?.id;

                return (
                  <motion.div
                    key={pick.id || idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`rounded-2xl p-3 flex items-center gap-3 ${
                      isMe
                        ? "bg-gradient-to-r from-[#f4c542]/15 to-[#d4a532]/15 border border-[#f4c542]/30"
                        : "bg-[#2d2d1e] border border-[#5a5a4a]/20"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#4a4a3a]/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[#a4a498]">
                        #{pick.pick_number}
                      </span>
                    </div>

                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center text-lg flex-shrink-0">
                      {getPlayerIcon(player)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">
                        {isMe
                          ? "You"
                          : player?.display_name || pick.user_email}
                      </p>
                      <p className="text-[#a4a498] text-xs truncate">
                        {pick.brand_name}
                      </p>
                    </div>

                    {brand?.logo_url && (
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center p-1.5 flex-shrink-0">
                        {failedImages.has(brand.id) ? (
                          <span className="font-bold text-gray-700 text-sm">
                            {brand.brand_name?.[0]}
                          </span>
                        ) : (
                          <img
                            src={brand.logo_url}
                            alt={brand.brand_name}
                            className="w-full h-full object-contain"
                            onError={() => handleImageError(brand.id)}
                          />
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
