import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { ArrowLeft, Edit, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ICONS = [
  { id: "icon1", emoji: "🎯", locked: false },
  { id: "icon2", emoji: "✏️", locked: false },
  { id: "icon3", emoji: "🎮", locked: true },
  { id: "icon4", emoji: "✋", locked: false },
  { id: "icon5", emoji: "📺", locked: true },
  { id: "icon6", emoji: "👔", locked: true },
];

export default function ProfileSetup() {
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get("code");
  const [displayName, setDisplayName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("icon1");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(user => {
      setDisplayName(user.full_name || "");
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }

    setSaving(true);
    try {
      const user = await base44.auth.me();
      
      // Check if player already exists
      const existing = await base44.entities.Player.filter({
        room_code: roomCode,
        user_email: user.email
      });

      if (existing.length > 0) {
        await base44.entities.Player.update(existing[0].id, {
          display_name: displayName,
          icon: selectedIcon
        });
      } else {
        await base44.entities.Player.create({
          room_code: roomCode,
          user_email: user.email,
          display_name: displayName,
          icon: selectedIcon,
          ready: false
        });
      }

      navigate(createPageUrl("Lobby") + `?code=${roomCode}`);
    } catch (error) {
      toast.error("Failed to save profile");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#3d3d2e] text-white pb-20">
      <div className="max-w-md mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-12">
          <button onClick={() => navigate(-1)} className="w-12 h-12 rounded-full bg-[#4a4a3a]/40 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[#a4a498] text-sm font-medium tracking-wider">PROFILE SETUP</h1>
          <div className="w-12" />
        </div>

        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center">
            <Edit className="w-10 h-10 text-[#2d2d1e]" />
          </div>
        </div>

        <h2 className="text-4xl font-black italic text-center mb-4">PICK YOUR PLAYER</h2>
        <p className="text-[#a4a498] text-center mb-12">Create your persona for the draft.</p>

        {/* Display Name */}
        <div className="mb-8">
          <label className="text-sm font-bold text-[#a4a498] mb-2 block tracking-wider">DISPLAY NAME</label>
          <div className="relative">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="h-16 rounded-2xl bg-white border-0 text-[#2d2d1e] text-lg font-medium pl-14"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">👤</div>
            {displayName && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Check className="w-6 h-6 text-green-500" />
              </div>
            )}
          </div>
        </div>

        {/* Icon Selection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-bold text-[#a4a498] tracking-wider">SELECT ICON</label>
            <span className="text-sm text-[#f4c542]">3/6 Unlocked</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {ICONS.map(icon => (
              <button
                key={icon.id}
                onClick={() => !icon.locked && setSelectedIcon(icon.id)}
                disabled={icon.locked}
                className={`aspect-square rounded-2xl flex items-center justify-center text-5xl transition-all ${
                  selectedIcon === icon.id
                    ? "bg-gradient-to-br from-[#f4c542] to-[#d4a532] border-4 border-[#2d2d1e]"
                    : icon.locked
                    ? "bg-[#4a4a3a]/20 border border-[#5a5a4a]/30 opacity-30 cursor-not-allowed"
                    : "bg-[#4a4a3a]/40 border border-[#5a5a4a]/30 hover:border-[#f4c542]/50"
                }`}
              >
                {icon.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="rounded-2xl bg-[#f4c542]/10 border border-[#f4c542]/20 p-4 mb-12 flex gap-3">
          <div className="text-[#f4c542] text-xl flex-shrink-0">ℹ️</div>
          <p className="text-sm text-[#d4d4c8]">
            Your selected icon and name will be visible to everyone in the draft room. Choose wisely!
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!displayName.trim() || saving}
          className="w-full h-16 rounded-[24px] bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold text-lg disabled:opacity-30 flex items-center justify-center gap-3"
        >
          {saving ? "SAVING..." : "SAVE & CONTINUE"}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Button>
      </div>
    </div>
  );
}