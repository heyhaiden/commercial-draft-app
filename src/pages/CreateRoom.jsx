import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { ArrowLeft, Gamepad2, Share2, Timer, Users, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function CreateRoom() {
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [roundTimer, setRoundTimer] = useState(60);
  const [snakeDraft, setSnakeDraft] = useState(true);
  const [roomCode, setRoomCode] = useState(null);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const generateCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const createRoom = async () => {
    setCreating(true);
    try {
      const user = await base44.auth.me();
      const code = generateCode();
      
      await base44.entities.GameRoom.create({
        room_code: code,
        host_email: user.email,
        status: "lobby",
        max_players: maxPlayers,
        round_timer: roundTimer,
        snake_draft: snakeDraft,
      });

      setRoomCode(code);
      toast.success("Room created!");
    } catch (error) {
      toast.error("Failed to create room");
      setCreating(false);
    }
  };

  const shareCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      toast.success("Code copied!");
    }
  };

  const goToLobby = () => {
    navigate(createPageUrl("ProfileSetup") + `?code=${roomCode}`);
  };

  if (roomCode) {
    return (
      <div className="min-h-screen bg-[#3d3d2e] text-white pb-20">
        <div className="max-w-md mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-12">
            <button onClick={() => navigate(-1)} className="w-12 h-12 rounded-full bg-[#4a4a3a]/40 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[#a4a498] text-sm font-medium tracking-wider">ADMIN PANEL</h1>
            <div className="w-12" />
          </div>

          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center">
              <Gamepad2 className="w-10 h-10 text-[#2d2d1e]" />
            </div>
          </div>

          <h2 className="text-4xl font-black italic text-center mb-4">CREATE GAME ROOM</h2>
          <p className="text-[#a4a498] text-center mb-12">Set up your draft environment</p>

          <div className="rounded-3xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30 p-6 mb-6">
            <div className="text-center mb-4">
              <p className="text-[#f4c542] text-sm font-bold tracking-wider mb-2">YOUR ROOM CODE</p>
              <p className="text-6xl font-black tracking-wider select-text">{roomCode}</p>
            </div>
            <Button
              onClick={shareCode}
              className="w-full h-12 rounded-2xl bg-[#5a5a4a]/40 hover:bg-[#6a6a5a]/40 text-white font-bold border border-[#6a6a5a]/30 flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Copy Code to Share
            </Button>
          </div>

          <Button
            onClick={goToLobby}
            className="w-full h-16 rounded-[24px] bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold text-lg"
          >
            GO TO LOBBY →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#3d3d2e] text-white pb-20">
      <div className="max-w-md mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-12">
          <button onClick={() => navigate(-1)} className="w-12 h-12 rounded-full bg-[#4a4a3a]/40 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[#a4a498] text-sm font-medium tracking-wider">ADMIN PANEL</h1>
          <div className="w-12" />
        </div>

        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center">
            <Gamepad2 className="w-10 h-10 text-[#2d2d1e]" />
          </div>
        </div>

        <h2 className="text-4xl font-black italic text-center mb-4">CREATE GAME ROOM</h2>
        <p className="text-[#a4a498] text-center mb-12">Set up your draft environment</p>

        <div className="space-y-4 mb-12">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold">Draft Settings</h3>
            <span className="text-[#a4a498] text-sm">Advanced</span>
          </div>

          {/* Round Timer */}
          <div className="rounded-2xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Timer className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-bold">Round Timer</p>
                  <p className="text-sm text-[#a4a498]">Time per pick</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setRoundTimer(Math.max(15, roundTimer - 15))} className="w-8 h-8 rounded-lg bg-[#5a5a4a]/40 flex items-center justify-center text-xl">-</button>
                <span className="text-2xl font-bold w-16 text-center">{roundTimer}s</span>
                <button onClick={() => setRoundTimer(Math.min(120, roundTimer + 15))} className="w-8 h-8 rounded-lg bg-[#5a5a4a]/40 flex items-center justify-center text-xl">+</button>
              </div>
            </div>
          </div>

          {/* Max Players */}
          <div className="rounded-2xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="font-bold">Max Players</p>
                  <p className="text-sm text-[#a4a498]">Room capacity</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setMaxPlayers(Math.max(2, maxPlayers - 1))} className="w-8 h-8 rounded-lg bg-[#5a5a4a]/40 flex items-center justify-center text-xl">-</button>
                <span className="text-2xl font-bold w-12 text-center">{maxPlayers}</span>
                <button onClick={() => setMaxPlayers(Math.min(12, maxPlayers + 1))} className="w-8 h-8 rounded-lg bg-[#5a5a4a]/40 flex items-center justify-center text-xl">+</button>
              </div>
            </div>
          </div>

          {/* Snake Draft */}
          <div className="rounded-2xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Grid3x3 className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="font-bold">Snake Draft</p>
                  <p className="text-sm text-[#a4a498]">Reverse order each round</p>
                </div>
              </div>
              <Switch checked={snakeDraft} onCheckedChange={setSnakeDraft} />
            </div>
          </div>
        </div>

        <Button
          onClick={createRoom}
          disabled={creating}
          className="w-full h-16 rounded-[24px] bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold text-lg"
        >
          {creating ? "CREATING..." : "CREATE ROOM"}
        </Button>
      </div>
    </div>
  );
}