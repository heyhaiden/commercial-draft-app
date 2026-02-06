import React, { useState, useEffect } from "react";
import { Star, X, Lock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function RatingPopup({ brand, isOwned, onRate, onClose, ratingEndsAt }) {
  const [selectedStars, setSelectedStars] = useState(0);
  const [hoveredStars, setHoveredStars] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!ratingEndsAt) return;
    const interval = setInterval(() => {
      const diff = new Date(ratingEndsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [ratingEndsAt]);

  const handleRate = () => {
    if (selectedStars > 0) {
      onRate(selectedStars);
      setSubmitted(true);
    }
  };

  const seconds = timeLeft !== null ? Math.floor(timeLeft / 1000) : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        {seconds !== null && seconds > 0 && (
          <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
            <Timer className="w-4 h-4" />
            <span>{seconds}s remaining</span>
          </div>
        )}

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white/90 flex items-center justify-center overflow-hidden">
            <img
              src={brand.logo_url}
              alt={brand.brand_name}
              className="w-12 h-12 object-contain"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.parentElement.innerHTML = `<span class="text-2xl font-bold text-gray-700">${brand.brand_name?.[0]}</span>`;
              }}
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{brand.brand_name}</h2>
            <p className="text-white/50 text-sm">{brand.title}</p>
          </div>
        </div>

        {isOwned ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
            <p className="text-amber-400 font-semibold text-lg">You Own This Brand</p>
            <p className="text-white/40 text-sm text-center">You drafted this brand, so you cannot rate it. Watch the ratings roll in!</p>
          </div>
        ) : submitted ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <span className="text-3xl">🎉</span>
            </motion.div>
            <p className="text-green-400 font-semibold text-lg">Rating Submitted!</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={cn("w-6 h-6", s <= selectedStars ? "text-yellow-400 fill-yellow-400" : "text-white/20")} />
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="text-white/70 text-center mb-4">How good was this commercial?</p>
            <div className="flex justify-center gap-3 mb-6">
              {[1, 2, 3, 4, 5].map(s => (
                <motion.button
                  key={s}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onMouseEnter={() => setHoveredStars(s)}
                  onMouseLeave={() => setHoveredStars(0)}
                  onClick={() => setSelectedStars(s)}
                  className="p-1"
                >
                  <Star className={cn(
                    "w-10 h-10 transition-all",
                    s <= (hoveredStars || selectedStars)
                      ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                      : "text-white/20"
                  )} />
                </motion.button>
              ))}
            </div>
            <Button
              onClick={handleRate}
              disabled={selectedStars === 0}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg disabled:opacity-30"
            >
              Submit Rating
            </Button>
          </>
        )}

        {brand.total_ratings > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm">
            <span className="text-white/40">Current average</span>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-white font-bold">{(brand.average_rating || 0).toFixed(1)}</span>
              <span className="text-white/40">({brand.total_ratings} votes)</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}