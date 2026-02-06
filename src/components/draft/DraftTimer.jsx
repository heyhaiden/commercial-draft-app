import React, { useState, useEffect } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DraftTimer({ endsAt, onExpired }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!endsAt) return;
    const interval = setInterval(() => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(0);
        onExpired?.();
        clearInterval(interval);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onExpired]);

  if (timeLeft === null) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const isUrgent = timeLeft < 30000;

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold",
      isUrgent
        ? "bg-red-500/20 text-red-400 animate-pulse"
        : "bg-white/10 text-white"
    )}>
      <Timer className="w-5 h-5" />
      <span>{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
    </div>
  );
}