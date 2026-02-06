import React from "react";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Award } from "lucide-react";
import { motion } from "framer-motion";

const rankIcons = {
  1: <Trophy className="w-6 h-6 text-yellow-400" />,
  2: <Medal className="w-6 h-6 text-gray-300" />,
  3: <Award className="w-6 h-6 text-amber-600" />,
};

export default function LeaderboardRow({ rank, userName, score, isCurrentUser, brandCount }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl transition-all",
        isCurrentUser
          ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 shadow-lg shadow-purple-500/10"
          : "bg-white/5 border border-white/5 hover:bg-white/10"
      )}
    >
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
        {rankIcons[rank] || <span className="text-white/60 font-bold text-sm">#{rank}</span>}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("font-semibold truncate", isCurrentUser ? "text-white" : "text-white/80")}>
          {userName}
          {isCurrentUser && <span className="ml-2 text-xs text-purple-400">(You)</span>}
        </p>
        <p className="text-white/40 text-xs">{brandCount || 0} brands drafted</p>
      </div>

      <div className="text-right">
        <p className={cn("font-bold text-xl tabular-nums", rank <= 3 ? "text-yellow-400" : "text-white")}>
          {score}
        </p>
        <p className="text-white/40 text-xs">pts</p>
      </div>
    </motion.div>
  );
}