import React from "react";
import { cn } from "@/lib/utils";
import { Star, CheckCircle, Clock } from "lucide-react";

const categoryColors = {
  "Tech": "border-blue-500/30 bg-blue-500/10",
  "Auto": "border-red-500/30 bg-red-500/10",
  "Food & Beverage": "border-amber-500/30 bg-amber-500/10",
  "Entertainment": "border-purple-500/30 bg-purple-500/10",
  "Other": "border-emerald-500/30 bg-emerald-500/10",
};

export default function MyLineup({ picks, brands }) {
  const categories = ["Tech", "Auto", "Food & Beverage", "Entertainment", "Other"];

  const getBrand = (brandId) => brands.find(b => b.id === brandId);

  return (
    <div className="space-y-4">
      {categories.map(cat => {
        const catPicks = picks.filter(p => p.category === cat);
        if (catPicks.length === 0) return null;

        return (
          <div key={cat}>
            <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">{cat}</h4>
            <div className="space-y-2">
              {catPicks.map(pick => {
                const brand = getBrand(pick.brand_id);
                if (!brand) return null;

                return (
                  <div key={pick.id} className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border",
                    categoryColors[cat],
                    brand.aired && "opacity-80"
                  )}>
                    <div className="w-10 h-10 rounded-lg bg-white/90 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img src={brand.logo_url} alt={brand.brand_name} className="w-8 h-8 object-contain"
                        onError={(e) => { e.target.style.display = "none"; e.target.parentElement.innerHTML = `<span class="font-bold text-gray-700">${brand.brand_name?.[0]}</span>`; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{brand.brand_name}</p>
                      <p className="text-white/40 text-xs truncate">{brand.title}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {brand.aired ? (
                        <>
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="text-white font-bold text-sm">{(brand.average_rating || 0).toFixed(1)}</span>
                          </div>
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </>
                      ) : (
                        <Clock className="w-4 h-4 text-white/30" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}