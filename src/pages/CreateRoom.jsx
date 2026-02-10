import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils";
import { getUserIdentity, setCurrentRoomCode } from "@/components/utils/guestAuth";
import { ArrowLeft, Gamepad2, Share2, Timer, Users, Grid3x3, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function CreateRoom() {
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [roundTimer, setRoundTimer] = useState(60);
  const [snakeDraft, setSnakeDraft] = useState(true);
  const [roomCode, setRoomCode] = useState(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    async function checkActiveRoom() {
      const userIdentity = await getUserIdentity(base44);
      const rooms = await base44.entities.GameRoom.filter({ host_email: userIdentity.id });
      const activeRooms = rooms.filter(r => r.status !== "completed");
      if (activeRooms.length > 0) {
        setActiveRoom(activeRooms[0]);
      }
      setLoading(false);
    }
    checkActiveRoom();
  }, []);

  // Generate 6-character alphanumeric code (2.1M+ combinations)
  // Excludes confusing characters: 0/O, 1/I/L
  const generateCode = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Check if room code already exists
  const isCodeUnique = async (code) => {
    const existing = await base44.entities.GameRoom.filter({ room_code: code });
    return existing.length === 0;
  };

  // Generate unique code with collision retry
  const generateUniqueCode = async (maxAttempts = 10) => {
    for (let i = 0; i < maxAttempts; i++) {
      const code = generateCode();
      if (await isCodeUnique(code)) {
        return code;
      }
    }
    throw new Error("Failed to generate unique room code");
  };

  const createRoom = async () => {
    setCreating(true);
    try {
      let userIdentity;
      try {
        userIdentity = await getUserIdentity(base44);
      } catch {
        toast.dismiss();
        toast.error("Failed to get user identity. Please try again.");
        setCreating(false);
        return;
      }

      let code;
      try {
        code = await generateUniqueCode();
      } catch {
        toast.dismiss();
        toast.error("Failed to generate unique room code. Please try again.");
        setCreating(false);
        return;
      }

      toast.loading("Creating room...");

      // Create the new room (brands stay global, state is room-scoped via ratings)
      try {
        await base44.entities.GameRoom.create({
          room_code: code,
          host_email: userIdentity.id,
          status: "lobby",
          max_players: maxPlayers,
          round_timer: roundTimer,
          snake_draft: snakeDraft,
        });
      } catch {
        toast.dismiss();
        toast.error("Failed to create room. The room code may already exist.");
        setCreating(false);
        return;
      }

      // Store room code for session-scoped queries
      setCurrentRoomCode(code);
      setRoomCode(code);
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries();
      
      toast.dismiss();
      toast.success("✨ Fresh room created!");
    } catch {
      toast.dismiss();
      toast.error("Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  const shareCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const goToLobby = () => {
    navigate(createPageUrl("Lobby") + `?code=${roomCode}`);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#3d3d2e] flex items-center justify-center"><p className="text-white">Loading...</p></div>;
  }

  if (activeRoom) {
    return (
      <div className="min-h-screen bg-[#3d3d2e] text-white pb-20 flex flex-col">
        <div className="max-w-md mx-auto px-6 py-6 flex-1 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[#4a4a3a]/40 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-[#a4a498] text-xs font-medium tracking-wider">ACTIVE GAME</h1>
            <div className="w-10" />
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center">
              <Gamepad2 className="w-8 h-8 text-[#2d2d1e]" />
            </div>
          </div>

          <h2 className="text-3xl font-black italic text-center mb-3">GAME IN PROGRESS</h2>
          <p className="text-[#a4a498] text-center text-sm mb-8">Room Code: {activeRoom.room_code}</p>

          <Button
            onClick={() => navigate(createPageUrl("Lobby") + `?code=${activeRoom.room_code}`)}
            className="w-full h-14 rounded-[24px] bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold text-base mb-3"
          >
            GO TO LOBBY →
          </Button>

          <Button
            onClick={() => navigate(createPageUrl("Admin"))}
            variant="outline"
            className="w-full h-14 rounded-[24px] bg-transparent border-2 border-[#5a5a4a]/40 text-white hover:bg-[#4a4a3a] font-bold text-base mb-3"
          >
            ADMIN PANEL →
          </Button>

          <Button
            onClick={async () => {
              if (confirm("Delete this game and start fresh?")) {
                try {
                  await Promise.all([
                    base44.entities.Player.filter({ room_code: activeRoom.room_code })
                      .then(players => Promise.all(players.map(p => base44.entities.Player.delete(p.id)))),
                    base44.entities.RoomDraftPick.filter({ room_code: activeRoom.room_code })
                      .then(picks => Promise.all(picks.map(p => base44.entities.RoomDraftPick.delete(p.id))))
                  ]);
                  await base44.entities.GameRoom.delete(activeRoom.id);
                  setActiveRoom(null);
                  toast.success("Game deleted");
                } catch {
                  toast.error("Failed to delete game");
                }
              }
            }}
            variant="destructive"
            className="w-full h-12 rounded-[24px]"
          >
            DELETE GAME
          </Button>
        </div>
      </div>
    );
  }

  if (roomCode) {
    return (
      <div className="min-h-screen bg-[#3d3d2e] text-white pb-20 flex flex-col">
        <div className="max-w-md mx-auto px-6 py-6 flex-1 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[#4a4a3a]/40 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-[#a4a498] text-xs font-medium tracking-wider">ADMIN PANEL</h1>
            <div className="w-10" />
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center">
              <Gamepad2 className="w-8 h-8 text-[#2d2d1e]" />
            </div>
          </div>

          <h2 className="text-3xl font-black italic text-center mb-3">ROOM CREATED!</h2>
          <p className="text-[#a4a498] text-center text-sm mb-8">Share this code with players</p>

          <div className="rounded-3xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30 p-5 mb-6">
            <div className="text-center mb-3">
              <p className="text-[#f4c542] text-xs font-bold tracking-wider mb-2">YOUR ROOM CODE</p>
              <p className="text-5xl font-black tracking-wider select-text">{roomCode}</p>
            </div>
            <Button
              onClick={shareCode}
              className={`w-full h-11 rounded-2xl font-bold border flex items-center justify-center gap-2 text-sm transition-all ${
                copied
                  ? "bg-green-500/40 border-green-500/50 text-green-300"
                  : "bg-[#5a5a4a]/40 hover:bg-[#6a6a5a]/40 text-white border-[#6a6a5a]/30"
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Code to Share"}
            </Button>
          </div>

          <Button
            onClick={goToLobby}
            className="w-full h-14 rounded-[24px] bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold text-base"
          >
            GO TO LOBBY →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#3d3d2e] text-white pb-20 flex flex-col">
      <div className="max-w-md mx-auto px-6 py-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[#4a4a3a]/40 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-[#a4a498] text-xs font-medium tracking-wider">ADMIN PANEL</h1>
          <div className="w-10" />
        </div>

        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center">
            <Gamepad2 className="w-7 h-7 text-[#2d2d1e]" />
          </div>
        </div>

        <h2 className="text-2xl font-black italic text-center mb-2">CREATE GAME ROOM</h2>
        <p className="text-[#a4a498] text-center text-sm mb-6">Set up your draft environment</p>

        <div className="space-y-3 mb-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold">Draft Settings</h3>
          </div>

          {/* Round Timer */}
          <div className="rounded-2xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Timer className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-bold text-sm">Round Timer</p>
                  <p className="text-xs text-[#a4a498]">Time per pick</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setRoundTimer(Math.max(15, roundTimer - 15))} className="w-7 h-7 rounded-lg bg-[#5a5a4a]/40 flex items-center justify-center text-lg">-</button>
                <span className="text-xl font-bold w-12 text-center">{roundTimer}s</span>
                <button onClick={() => setRoundTimer(Math.min(120, roundTimer + 15))} className="w-7 h-7 rounded-lg bg-[#5a5a4a]/40 flex items-center justify-center text-lg">+</button>
              </div>
            </div>
          </div>

          {/* Max Players */}
          <div className="rounded-2xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-bold text-sm">Max Players</p>
                  <p className="text-xs text-[#a4a498]">Room capacity</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setMaxPlayers(Math.max(2, maxPlayers - 1))} className="w-7 h-7 rounded-lg bg-[#5a5a4a]/40 flex items-center justify-center text-lg">-</button>
                <span className="text-xl font-bold w-10 text-center">{maxPlayers}</span>
                <button onClick={() => setMaxPlayers(Math.min(12, maxPlayers + 1))} className="w-7 h-7 rounded-lg bg-[#5a5a4a]/40 flex items-center justify-center text-lg">+</button>
              </div>
            </div>
          </div>

          {/* Snake Draft */}
          <div className="rounded-2xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Grid3x3 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-bold text-sm">Snake Draft</p>
                  <p className="text-xs text-[#a4a498]">Reverse order each round</p>
                </div>
              </div>
              <Switch checked={snakeDraft} onCheckedChange={setSnakeDraft} />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button
            onClick={createRoom}
            disabled={creating}
            className="w-full h-14 rounded-[24px] bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold text-base"
          >
            {creating ? "CREATING..." : "CREATE ROOM"}
          </Button>
        </div>
      </div>
    </div>
  );
}