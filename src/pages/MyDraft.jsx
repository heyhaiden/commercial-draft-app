import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getUserIdentity } from "@/utils/guestAuth";
import { useQuery } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import SeasonScorecard from "@/components/game/SeasonScorecard";
import { BrandCardSkeleton } from "@/components/common/LoadingSkeleton";
import OnboardingTooltip from "@/components/common/OnboardingTooltip";
import { motion } from "framer-motion";

export default function MyDraft() {
  const [user, setUser] = useState(null);
  const [showScorecard, setShowScorecard] = useState(false);
  const [hasShownScorecard, setHasShownScorecard] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    getUserIdentity(base44).then(setUser);
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list(),
  });

  const { data: myPicks = [], isLoading: picksLoading } = useQuery({
    queryKey: ["myPicks", user?.id],
    queryFn: () => base44.entities.DraftPick.filter({ user_email: user.id, locked: true }),
    enabled: !!user,
  });

  const { data: allPicks = [] } = useQuery({
    queryKey: ["allPicks"],
    queryFn: () => base44.entities.DraftPick.filter({ locked: true }),
  });

  // Calculate rank
  const userScores = {};
  allPicks.forEach(pick => {
    if (!userScores[pick.user_email]) userScores[pick.user_email] = 0;
    const brand = brands.find(b => b.id === pick.brand_id);
    if (brand?.aired) userScores[pick.user_email] += brand.points || 0;
  });
  const sortedUsers = Object.entries(userScores).sort((a, b) => b[1] - a[1]);
  const myRank = sortedUsers.findIndex(([email]) => email === user?.id) + 1;

  const categories = ["Tech", "Auto", "Food & Beverage", "Entertainment", "Other"];

  // Check if game is complete
  const allBrandsRated = brands.every(b => !b.aired || b.total_ratings > 0);
  const isGameComplete = brands.filter(b => b.aired).length > 0 && allBrandsRated;

  useEffect(() => {
    if (isGameComplete && !hasShownScorecard) {
      setShowScorecard(true);
      setHasShownScorecard(true);
    }
  }, [isGameComplete, hasShownScorecard]);

  const playerIcon = "🏈"; // Get from player data
  const playerData = user ? {
    displayName: user.name?.replace(" ", "") || "Player",
    icon: playerIcon,
    rank: myRank,
    picks: myPicks,
  } : null;

  return (
    <div className="min-h-screen bg-[#1d1d0e] text-white pb-24">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black">My Drafted Lineup</h1>
        </div>

        {/* Status Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-[#4a4a3a]/40 to-[#3a3a2a]/40 border border-[#5a5a4a]/30 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <p className="text-white text-sm font-bold">LIVE • 2ND QUARTER</p>
              </div>
              <p className="text-[#a4a498] text-xs">Next Break: ~4 mins remaining</p>
              <div className="w-48 h-1 bg-[#5a5a4a]/30 rounded-full mt-2">
                <div className="w-3/4 h-full bg-[#f4c542] rounded-full" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[#a4a498] text-xs">Current Rank</p>
              <p className="text-white text-3xl font-black">#{myRank || "-"}</p>
            </div>
          </div>
        </div>

        {/* Categories */}
        {categories.map(category => {
          const catPicks = myPicks.filter(p => p.category === category);
          if (catPicks.length === 0) return null;

          return (
            <div key={category} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg">{category}</h2>
                <span className="text-[#a4a498] text-sm">{catPicks.length} DRAFTED</span>
              </div>
              
              <div className="space-y-2">
                {picksLoading ? (
                  Array.from({ length: 2 }).map((_, idx) => <BrandCardSkeleton key={idx} />)
                ) : (
                  catPicks.map(pick => {
                    const brand = brands.find(b => b.id === pick.brand_id);
                    if (!brand) return null;

                    const isAiring = brand.is_airing;
                    const isPending = !brand.aired && !brand.is_airing;

                    return (
                      <motion.div
                        key={pick.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-2xl border p-4 flex items-center gap-3 ${
                          isAiring
                            ? "bg-gradient-to-r from-[#f4c542]/20 to-[#d4a532]/20 border-[#f4c542] animate-pulse"
                            : "bg-[#2d2d1e] border-[#5a5a4a]/30"
                        }`}
                      >
                      <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center flex-shrink-0 p-2">
                        <img
                          src={brand.logo_url}
                          alt={brand.brand_name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentElement.innerHTML = `<span class="font-bold text-gray-700 text-lg">${brand.brand_name?.[0]}</span>`;
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white">{brand.brand_name}</p>
                        <p className="text-[#a4a498] text-sm">Projected: {Math.round((brand.average_rating || 3) * 20 - 10)} pts</p>
                      </div>
                      <div className="text-right">
                        {isAiring ? (
                          <>
                            <p className="text-[#f4c542] text-xs font-bold">AIRING NOW</p>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-white text-xs">LIVE</span>
                            </div>
                          </>
                        ) : isPending ? (
                          <>
                            <p className="text-[#a4a498] text-xs">PENDING</p>
                            <p className="text-[#6a6a5a] text-2xl font-black">0</p>
                            <p className="text-[#6a6a5a] text-xs">PTS</p>
                          </>
                        ) : (
                          <>
                            <p className="text-green-400 text-xs">AIRED</p>
                            <p className="text-white text-2xl font-black">{brand.points || 0}</p>
                            <p className="text-[#a4a498] text-xs">PTS</p>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SeasonScorecard
        show={showScorecard}
        onClose={() => setShowScorecard(false)}
        playerData={playerData}
        brands={brands}
      />
      
      <OnboardingTooltip
        show={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </div>
  );
}