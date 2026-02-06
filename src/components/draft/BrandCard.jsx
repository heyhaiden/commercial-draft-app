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
      whileHover={!disabled ? { scale: 1.03 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      onClick={() => !disabled && onToggle?.(brand)}
      className={cn(
        "relative group w-full rounded-2xl border backdrop-blur-xl p-4 transition-all duration-300 text-left",
        "bg-gradient-to-br",
        categoryGradients[brand.category] || categoryGradients["Other"],
        isSelected && "ring-2 ring-white shadow-lg shadow-white/10",
        disabled && !isSelected && "opacity-40 cursor-not-allowed",
        !disabled && "cursor-pointer hover:shadow-lg hover:shadow-white/5"
      )}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shadow-lg z-10">
          <Check className="w-4 h-4 text-white" strokeWidth={3} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/90 flex items-center justify-center overflow-hidden flex-shrink-0">
          <img
            src={brand.logo_url}
            alt={brand.brand_name}
            className="w-10 h-10 object-contain"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.parentElement.innerHTML = `<span class="text-lg font-bold text-gray-700">${brand.brand_name?.[0] || "?"}</span>`;
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white text-sm truncate">{brand.brand_name}</h3>
          <p className="text-white/60 text-xs truncate mt-0.5">{brand.title}</p>
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