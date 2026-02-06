import React from "react";
import { cn } from "@/lib/utils";
import { Clock, Zap, BarChart3, Trophy, Users } from "lucide-react";

const phases = [
  { key: "pre_draft", label: "Lobby", icon: Clock },
  { key: "drafting", label: "Draft", icon: Users },
  { key: "pre_game", label: "Pre-Game", icon: Zap },
  { key: "live", label: "Live", icon: BarChart3 },
  { key: "post_game", label: "Results", icon: Trophy },
];

export default function GamePhaseIndicator({ currentPhase }) {
  const currentIdx = phases.findIndex(p => p.key === currentPhase);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {phases.map((phase, idx) => {
        const Icon = phase.icon;
        const isActive = phase.key === currentPhase;
        const isPast = idx < currentIdx;

        return (
          <div key={phase.key} className="flex items-center gap-1">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              isActive && "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20",
              isPast && "bg-white/10 text-white/60",
              !isActive && !isPast && "bg-white/5 text-white/30"
            )}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{phase.label}</span>
            </div>
            {idx < phases.length - 1 && (
              <div className={cn("w-4 h-0.5 rounded-full", isPast ? "bg-white/30" : "bg-white/10")} />
            )}
          </div>
        );
      })}
    </div>
  );
}