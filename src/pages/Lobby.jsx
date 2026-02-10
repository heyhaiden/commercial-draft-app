import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUserIdentity } from "@/components/utils/guestAuth";
import { ArrowLeft, Settings, CheckCircle, Clock, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Lobby() {
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get("code");
  const [user, setUser] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const room = rooms[0];
  const isHost = user && room && user.id === room.host_email;
  const myPlayer = players.find(p => p.user_email === user?.id);

  const createDummyUserMutation = useMutation({
    mutationFn: async () => {
      const dummyName = `Player${Math.floor(Math.random() * 1000)}`;
      const dummyEmail = `dummy${Date.now()}@test.com`;
      const dummyIcon = `icon${Math.floor(Math.random() * 6) + 1}`;

      // Get current non-host players for turn order
      const nonHostPlayers = players.filter(p => p.user_email !== room.host_email);
      
      await base44.entities.Player.create({
        room_code: roomCode,
        user_email: dummyEmail,
        display_name: dummyName,
        icon: dummyIcon,
        ready: true,
        turn_order: nonHostPlayers.length,
      });

      toast.success("Dummy player added!");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });

  useEffect(() => {
    if (room?.draft_starts_at) {
      const interval = setInterval(() => {
        const now = Date.now();
        const start = new Date(room.draft_starts_at).getTime();
        const diff = start - now;
        if (diff <= 0) {
          navigate(createPageUrl("RoomDraft") + `?code=${roomCode}`);
        } else {
          setTimeRemaining(diff);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [room?.draft_starts_at, roomCode, navigate]);

  const toggleReadyMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Player.update(myPlayer.id, { ready: !myPlayer.ready });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });

  // Proper Fisher-Yates shuffle for fair turn order
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startDraftMutation = useMutation({
    mutationFn: async () => {
      // Assign turn orders only to non-host players with fair shuffle
      const nonHostPlayers = players.filter(p => p.user_email !== room.host_email);
      const shuffled = shuffleArray(nonHostPlayers);

      // Update all turn orders atomically with error handling
      try {
        await Promise.all(
          shuffled.map((player, i) =>
            base44.entities.Player.update(player.id, { turn_order: i }).catch((error) => {
              console.error(`Failed to update player ${player.id}:`, error);
              // Continue with other updates even if one fails
            })
          )
        );
      } catch (error) {
        console.error("Error updating player turn orders:", error);
        throw error;
      }

      const startTime = new Date(Date.now() + 15000).toISOString();
      await base44.entities.GameRoom.update(room.id, {
        status: "drafting",
        draft_starts_at: startTime,
        turn_started_at: startTime,
      });
    },
    onSuccess: () => {
      toast.success("Draft starting in 15 seconds!");
      queryClient.invalidateQueries({ queryKey: ["room"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start draft");
    },
  });

  const formatTime = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return { days, hours, mins, secs };
  };

  if (!room) return null;

  const time = timeRemaining ? formatTime(timeRemaining) : null;

  return (
    <div className="min-h-screen bg-[#3d3d2e] text-white pb-20">
      <div className="max-w-md mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="w-12 h-12 rounded-full bg-[#4a4a3a]/40 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-white font-black italic text-xl">COMMERCIAL DRAFT</h1>
            <p className="text-[#f4c542] text-xs font-medium">THE BIG GAME</p>
          </div>
          {isHost && (
            <button onClick={() => navigate(createPageUrl("Admin"))} className="w-12 h-12 rounded-full bg-[#4a4a3a]/40 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </button>
          )}
          {!isHost && <div className="w-12" />}
        </div>

        {/* Countdown */}
        {time && (
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#f4c542]" />
              <p className="text-[#f4c542] text-sm font-bold tracking-wider">DRAFT BEGINS IN</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "DAYS", value: time.days },
                { label: "HOURS", value: time.hours },
                { label: "MINS", value: time.mins },
                { label: "SECS", value: time.secs },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl bg-[#2d2d1e] border border-[#5a5a4a]/30 p-3">
                  <p className="text-4xl font-black text-white">{String(value).padStart(2, '0')}</p>
                  <p className="text-[#a4a498] text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lobby Roster */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-xl">Lobby Roster</h2>
            <span className="text-[#a4a498] text-sm">{players.filter(p => p.user_email !== room.host_email).length}/{room.max_players} Joined</span>
          </div>

          <div className="space-y-2">
            {players.filter(p => p.user_email !== room.host_email).map((player, idx) => {
              const icon = player.icon ? ICONS.find(i => i.id === player.icon)?.emoji : "👤";
              const isMe = player.user_email === user?.id;
              return (
                <div
                  key={player.id}
                  className={`rounded-2xl p-4 flex items-center gap-3 ${
                    isMe
                      ? "bg-gradient-to-r from-[#f4c542]/20 to-[#d4a532]/20 border-2 border-[#f4c542]"
                      : "bg-[#4a4a3a]/20 border border-[#5a5a4a]/30"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center text-2xl flex-shrink-0">
                    {icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white">
                      {player.display_name}
                    </p>
                    <p className={`text-xs ${player.ready ? "text-green-400" : "text-[#a4a498]"}`}>
                      {player.ready ? "Ready" : "Connecting..."}
                    </p>
                  </div>
                  {player.ready && <CheckCircle className="w-6 h-6 text-green-400" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        {isHost ? (
          <Button
            onClick={() => startDraftMutation.mutate()}
            disabled={players.filter(p => p.user_email !== room.host_email).length < 2 || startDraftMutation.isPending}
            className="w-full h-16 rounded-[24px] bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold text-lg disabled:opacity-30 flex items-center justify-center gap-3"
          >
            <Rocket className="w-5 h-5" />
            START DRAFT
            <Rocket className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            onClick={() => toggleReadyMutation.mutate()}
            disabled={toggleReadyMutation.isPending || myPlayer?.ready}
            className={`w-full h-16 rounded-[24px] font-bold text-lg flex items-center justify-center gap-3 ${
              myPlayer?.ready
                ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                : "bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e]"
            }`}
          >
            {myPlayer?.ready ? (
              <>
                <CheckCircle className="w-5 h-5" />
                READY TO DRAFT
              </>
            ) : (
              "MARK AS READY"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

const ICONS = [
  { id: "icon1", emoji: "🏈" },
  { id: "icon2", emoji: "🏆" },
  { id: "icon3", emoji: "⭐" },
  { id: "icon4", emoji: "🔥" },
  { id: "icon5", emoji: "⚡" },
  { id: "icon6", emoji: "👑" },
];