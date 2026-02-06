import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Edit, Tv } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path || location.pathname === `${path}.html`;
  };

  const navItems = [
    { label: "Home", icon: Home, path: createPageUrl("Home") },
    { label: "Draft", icon: Edit, path: createPageUrl("Draft") },
    { label: "Game", icon: Tv, path: createPageUrl("Game") },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-t border-white/10 safe-area-bottom md:hidden">
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map(({ label, icon: Icon, path }) => {
          const active = isActive(path);
          return (
            <Link
              key={label}
              to={path}
              className={cn(
                "flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all",
                active && "bg-white/10"
              )}
            >
              <Icon className={cn("w-5 h-5", active ? "text-purple-400" : "text-white/40")} />
              <span className={cn("text-xs font-medium", active ? "text-white" : "text-white/40")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}