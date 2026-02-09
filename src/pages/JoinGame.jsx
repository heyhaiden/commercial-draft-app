import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUserIdentity } from "@/utils/guestAuth";
import { motion } from "framer-motion";
import { ArrowLeft, Bookmark, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function JoinGame() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleKeyPress = (num) => {
    if (code.length < 4) {
      setCode(code + num);
    }
  };

  const handleClear = () => {
    setCode("");
  };

  const handleBackspace = () => {
    setCode(code.slice(0, -1));
  };

  const handleJoin = async () => {
    if (code.length !== 4) {
      toast.error("Please enter a 4-digit code");
      return;
    }

    try {
      const rooms = await base44.entities.GameRoom.filter({ room_code: code });
      if (rooms.length === 0) {
        toast.error("Room not found");
        return;
      }

      const room = rooms[0];
      const userIdentity = await getUserIdentity(base44);
      
      // Check if already in room
      const existingPlayer = await base44.entities.Player.filter({
        room_code: code,
        user_email: userIdentity.id
      });

      if (existingPlayer.length > 0) {
        navigate(createPageUrl("Lobby") + `?code=${code}`);
      } else {
        navigate(createPageUrl("ProfileSetup") + `?code=${code}`);
      }
    } catch (error) {
      toast.error("Error joining room");
    }
  };

  const buttons = [
    { num: "1", letters: "" },
    { num: "2", letters: "ABC" },
    { num: "3", letters: "DEF" },
    { num: "4", letters: "GHI" },
    { num: "5", letters: "JKL" },
    { num: "6", letters: "MNO" },
    { num: "7", letters: "PQRS" },
    { num: "8", letters: "TUV" },
    { num: "9", letters: "WXYZ" },
  ];

  return (
    <div className="min-h-screen bg-[#3d3d2e] text-white pb-20 flex flex-col">
      <div className="max-w-md mx-auto px-6 py-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[#4a4a3a]/40 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-[#a4a498] text-xs font-medium tracking-wider">JOIN GAME</h1>
          <div className="w-10" />
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-[#4a4a3a]/40 border border-[#5a5a4a]/50 flex items-center justify-center">
            <Bookmark className="w-6 h-6 text-[#f4c542]" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black italic text-center mb-2">ENTER ROOM CODE</h2>
        <p className="text-[#a4a498] text-center text-sm mb-6">Ask the host for the 4-digit game ID</p>

        {/* Code Display */}
        <div className="mb-4">
          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-14 h-16 rounded-2xl bg-[#4a4a3a]/20 border-2 border-[#5a5a4a]/30 flex items-center justify-center"
              >
                <span className="text-3xl font-bold text-white">
                  {code[i] || ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {buttons.map(({ num, letters }) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-xl bg-[#4a4a3a]/40 border border-[#5a5a4a]/30 flex flex-col items-center justify-center hover:bg-[#5a5a4a]/40 transition-colors"
            >
              <span className="text-lg font-bold">{num}</span>
              {letters && <span className="text-[9px] text-[#a4a498]">{letters}</span>}
            </button>
          ))}
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={handleClear}
            className="h-14 rounded-xl bg-[#4a4a3a]/40 border border-[#5a5a4a]/30 flex items-center justify-center hover:bg-[#5a5a4a]/40 transition-colors"
          >
            <span className="text-[9px] text-[#a4a498]">CLEAR</span>
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            className="h-14 rounded-xl bg-[#4a4a3a]/40 border border-[#5a5a4a]/30 flex items-center justify-center hover:bg-[#5a5a4a]/40 transition-colors"
          >
            <span className="text-lg font-bold">0</span>
          </button>
          <button
            onClick={handleBackspace}
            className="h-14 rounded-xl bg-[#4a4a3a]/40 border border-[#5a5a4a]/30 flex items-center justify-center hover:bg-[#5a5a4a]/40 transition-colors"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Join Button */}
        <div>
          <Button
            onClick={handleJoin}
            disabled={code.length !== 4}
            className="w-full h-14 rounded-[24px] bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold text-base disabled:opacity-30 flex items-center justify-center gap-3"
          >
            JOIN LOBBY
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}