import React from "react";
import { Star, TrendingUp, TrendingDown, Zap } from "lucide-react";

export default function PostGameStats({ brands }) {
  if (!brands || brands.length === 0) return null;

  const airedBrands = brands.filter(b => b.aired && b.total_ratings > 0);
  if (airedBrands.length === 0) return null;

  const sorted = [...airedBrands].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
  const topAd = sorted[0];
  const worstAd = sorted[sorted.length - 1];

  // Most controversial = highest variance in ratings (approximated)
  const mostControversial = airedBrands.reduce((best, b) => {
    const spread = Math.abs((b.average_rating || 0) - 3);
    return spread < (best?.spread || 999) ? { ...b, spread } : best;
  }, null);

  const stats = [
    { label: "🏆 Highest Rated", brand: topAd, icon: TrendingUp, color: "from-yellow-500/20 to-amber-500/20 border-yellow-400/30" },
    { label: "💥 Biggest Bust", brand: worstAd, icon: TrendingDown, color: "from-red-500/20 to-rose-500/20 border-red-400/30" },
    { label: "🤔 Most Controversial", brand: mostControversial, icon: Zap, color: "from-purple-500/20 to-pink-500/20 border-purple-400/30" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {stats.map(({ label, brand, icon: Icon, color }) => brand && (
        <div key={label} className={`rounded-2xl border bg-gradient-to-br ${color} p-4`}>
          <p className="text-white/60 text-xs font-semibold mb-3">{label}</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/90 flex items-center justify-center overflow-hidden">
              <img src={brand.logo_url} alt={brand.brand_name} className="w-8 h-8 object-contain"
                onError={(e) => { e.target.style.display = "none"; e.target.parentElement.innerHTML = `<span class="font-bold text-gray-700">${brand.brand_name?.[0]}</span>`; }}
              />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{brand.brand_name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-white/70 text-xs">{(brand.average_rating || 0).toFixed(1)} avg</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}