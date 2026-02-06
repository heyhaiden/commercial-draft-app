import React, { useState } from "react";
import BrandCard from "./BrandCard";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const categoryIcons = {
  "Tech": "💻",
  "Auto": "🚗",
  "Food & Beverage": "🍔",
  "Entertainment": "🎬",
  "Other": "✨",
};

const categoryColors = {
  "Tech": "text-blue-400",
  "Auto": "text-red-400",
  "Food & Beverage": "text-amber-400",
  "Entertainment": "text-purple-400",
  "Other": "text-emerald-400",
};

export default function CategorySection({ category, brands, selectedIds, onToggle }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const selectedInCategory = brands.filter(b => selectedIds.includes(b.id)).length;

  return (
    <div className="space-y-3">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full group"
      >
        <h3 className={cn("font-bold text-lg flex items-center gap-2", categoryColors[category])}>
          <span>{categoryIcons[category]}</span>
          {category}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium px-3 py-1 rounded-full bg-white/10 text-white/60">
            {selectedInCategory} selected
          </span>
          <ChevronDown className={cn(
            "w-5 h-5 text-white/60 transition-transform duration-300",
            isExpanded && "rotate-180"
          )} />
        </div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {brands.map(brand => (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  isSelected={selectedIds.includes(brand.id)}
                  onToggle={onToggle}
                  disabled={false}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}