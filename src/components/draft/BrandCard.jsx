import React from "react";
import { cn } from "@/lib/utils";
import { Check, Star } from "lucide-react";
import { motion } from "framer-motion";

const categoryGradients = {
  "Tech": "from-blue-500/20 to-cyan-500/20 border-blue-400/30",
  "Auto": "from-red-500/20 to-orange-500/20 border-red-400/30",
  "Food & Beverage": "from-amber-500/20 to-yellow-500/20 border-amber-400/30",
  "Entertainment": "from-purple-500/20 to-pink-500/20 border-purple-400/30",
  "Other": "from-emerald-500/20 to-teal-500/20 border-emerald-400/30",
};

const categoryAccents = {
  "Tech": "bg-blue-500",
  "Auto": "bg-red-500",
  "Food & Beverage": "bg-amber-500",
  "Entertainment": "bg-purple-500",
  "Other": "bg-emerald-500",
};

export default function BrandCard({ brand, isSelected, onToggle, disabled, showRating }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => !disabled && onToggle?.(brand)}
      className={cn(
        "relative w-full aspect-square rounded-3xl border backdrop-blur-xl p-4 transition-all duration-200 text-center flex flex-col items-center justify-center",
        "bg-gradient-to-br shadow-lg",
        categoryGradients[brand.category] || categoryGradients["Other"],
        isSelected && "ring-4 ring-yellow-400 shadow-2xl shadow-yellow-400/30",
        disabled && !isSelected && "opacity-40 cursor-not-allowed",
        !disabled && "cursor-pointer active:scale-95"
      )}
    >
      {isSelected && (
        <>
          <div className="absolute inset-0 bg-black/40 rounded-3xl z-[5]" />
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="absolute inset-0 flex items-center justify-center z-10"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl">
              <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
          </motion.div>
        </>
      )}

      <div className="flex flex-col items-center gap-3 w-full h-full justify-center">
        <div className="w-20 h-20 rounded-2xl bg-white/95 flex items-center justify-center overflow-hidden shadow-lg flex-shrink-0">
          <img
            src={brand.logo_url}
            alt={brand.brand_name}
            className="w-16 h-16 object-contain"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.parentElement.innerHTML = `<span class="text-2xl font-bold text-gray-700">${brand.brand_name?.[0] || "?"}</span>`;
            }}
          />
        </div>
        <div className="w-full">
          <h3 className="font-bold text-white text-sm leading-tight mb-1">{brand.brand_name}</h3>
          <p className="text-white/60 text-xs leading-tight line-clamp-2">{brand.title}</p>
        </div>
      </div>

      {showRating && brand.aired && (
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn("w-3.5 h-3.5", s <= Math.round(brand.average_rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-white/20")}
              />
            ))}
          </div>
          <span className="text-xs text-white/50">{brand.total_ratings || 0} votes</span>
        </div>
      )}

      <div className={cn("absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl", categoryAccents[brand.category] || categoryAccents["Other"])} />
    </motion.button>
  );
}