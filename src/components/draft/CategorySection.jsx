import React from "react";
import BrandCard from "./BrandCard";
import { cn } from "@/lib/utils";

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

export default function CategorySection({ category, brands, selectedIds, onToggle, maxPerCategory }) {
  const selectedInCategory = brands.filter(b => selectedIds.includes(b.id)).length;
  const isFull = selectedInCategory >= maxPerCategory;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className={cn("font-bold text-lg flex items-center gap-2", categoryColors[category])}>
          <span>{categoryIcons[category]}</span>
          {category}
        </h3>
        <span className={cn(
          "text-sm font-medium px-3 py-1 rounded-full",
          isFull ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/60"
        )}>
          {selectedInCategory}/{maxPerCategory}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {brands.map(brand => (
          <BrandCard
            key={brand.id}
            brand={brand}
            isSelected={selectedIds.includes(brand.id)}
            onToggle={onToggle}
            disabled={isFull && !selectedIds.includes(brand.id)}
          />
        ))}
      </div>
    </div>
  );
}