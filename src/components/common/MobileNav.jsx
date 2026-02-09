import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ClipboardList, ThumbsUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path || location.pathname === `${path}.html`;
  };

  const navItems = [
    { label: "My Picks", icon: ClipboardList, path: createPageUrl("MyDraft") },
    { label: "Rate", icon: ThumbsUp, path: createPageUrl("Rate") },
    { label: "Rank", icon: Trophy, path: createPageUrl("Leaderboard") },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#2d2d1e]/95 backdrop-blur-xl border-t border-[#5a5a4a]/30 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map(({ label, icon: Icon, path }) => {
          const active = isActive(path);
          return (
            <Link
              key={label}
              to={path}
              className="flex flex-col items-center gap-1 px-6 py-2"
            >
              <Icon className={cn("w-6 h-6", active ? "text-[#f4c542]" : "text-[#a4a498]")} />
              <span className={cn("text-xs font-medium", active ? "text-[#f4c542]" : "text-[#a4a498]")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}