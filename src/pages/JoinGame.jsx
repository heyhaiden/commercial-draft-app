import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUserIdentity } from "@/components/utils/guestAuth";
import { ArrowLeft, Bookmark, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CODE_LENGTH = 6;
// Matches CreateRoom.jsx character set (excludes confusing: 0/O, 1/I/L)
const VALID_CHARS = /^[A-HJ-NP-Z2-9]+$/i;

export default function JoinGame() {
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const handleCodeChange = (value) => {
    // Filter to only valid characters and uppercase
    const filtered = value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "");
    if (filtered.length <= CODE_LENGTH) {
      setCode(filtered);
    }
  };

  const handleKeyPress = (char) => {
    if (code.length < CODE_LENGTH) {
      setCode(code + char.toUpperCase());
    }
  };

  const handleClear = () => {
    setCode("");
  };

  const handleBackspace = () => {
    setCode(code.slice(0, -1));
  };

  const handleJoin = async () => {
    if (code.length !== CODE_LENGTH) {
      toast.error(`Please enter a ${CODE_LENGTH}-character code`);
      return;
    }

    setJoining(true);
    try {
      const rooms = await base44.entities.GameRoom.filter({ room_code: code });
      if (rooms.length === 0) {
        toast.error("Room not found");
        setJoining(false);
        return;
      }

      const room = rooms[0];

      // Validate room status - only allow joining lobby or drafting rooms
      if (room.status === "completed") {
        toast.error("This game has already ended");
        setJoining(false);
        return;
      }

      if (room.status === "drafting") {
        toast.error("Draft already in progress");
        setJoining(false);
        return;
      }

      const userIdentity = await getUserIdentity(base44);

      // Check if user is the host - skip profile setup
      if (userIdentity.id === room.host_email) {
        navigate(createPageUrl("Lobby") + `?code=${code}`);
        return;
      }

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
      setJoining(false);
    }
  };

  // Alphanumeric keypad layout
  const row1 = ["A", "B", "C", "D", "E", "F"];
  const row2 = ["G", "H", "J", "K", "M", "N"];
  const row3 = ["P", "Q", "R", "S", "T", "U"];
  const row4 = ["V", "W", "X", "Y", "Z", "2"];
  const row5 = ["3", "4", "5", "6", "7", "8", "9"];

  const KeyButton = ({ char }) => (
    <button
      onClick={() => handleKeyPress(char)}
      className="h-12 rounded-xl bg-[#4a4a3a]/40 border border-[#5a5a4a]/30 flex items-center justify-center hover:bg-[#5a5a4a]/40 transition-colors"
    >
      <span className="text-lg font-bold">{char}</span>
    </button>
  );

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
        <p className="text-[#a4a498] text-center text-sm mb-4">Ask the host for the 6-character game code</p>

        {/* Code Display - clickable to focus hidden input */}
        <div className="mb-4">
          <div
            className="flex items-center justify-center gap-2 cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            {[...Array(CODE_LENGTH)].map((_, i) => (
              <div
                key={i}
                className={`w-11 h-14 rounded-xl bg-[#4a4a3a]/20 border-2 flex items-center justify-center transition-colors ${
                  i === code.length ? "border-[#f4c542]" : "border-[#5a5a4a]/30"
                }`}
              >
                <span className="text-2xl font-bold text-white">
                  {code[i] || ""}
                </span>
              </div>
            ))}
          </div>
          {/* Hidden input for keyboard/paste support */}
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && code.length === CODE_LENGTH && handleJoin()}
            className="opacity-0 absolute -z-10"
            autoComplete="off"
            autoCapitalize="characters"
          />
        </div>

        {/* Alphanumeric Keypad */}
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-6 gap-1.5">
            {row1.map(char => <KeyButton key={char} char={char} />)}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {row2.map(char => <KeyButton key={char} char={char} />)}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {row3.map(char => <KeyButton key={char} char={char} />)}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {row4.map(char => <KeyButton key={char} char={char} />)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {row5.map(char => <KeyButton key={char} char={char} />)}
          </div>
        </div>

        {/* Control Row */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={handleClear}
            className="h-12 rounded-xl bg-[#4a4a3a]/40 border border-[#5a5a4a]/30 flex items-center justify-center hover:bg-[#5a5a4a]/40 transition-colors"
          >
            <span className="text-xs text-[#a4a498] font-medium">CLEAR</span>
          </button>
          <button
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-[#4a4a3a]/40 border border-[#5a5a4a]/30 flex items-center justify-center hover:bg-[#5a5a4a]/40 transition-colors"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Join Button */}
        <div className="mt-auto">
          <Button
            onClick={handleJoin}
            disabled={code.length !== CODE_LENGTH || joining}
            className="w-full h-14 rounded-[24px] bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold text-base disabled:opacity-30 flex items-center justify-center gap-3"
          >
            {joining ? "JOINING..." : "JOIN LOBBY"}
            {!joining && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
