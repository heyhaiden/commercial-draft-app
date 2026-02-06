import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Tv, Star, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

import RatingPopup from "../components/rating/RatingPopup";
import LeaderboardRow from "../components/leaderboard/LeaderboardRow";
import MyLineup from "../components/lineup/MyLineup";
import PostGameStats from "../components/stats/PostGameStats";
import GamePhaseIndicator from "../components/common/GamePhaseIndicator";

export default function Game() {
  const [user, setUser] = useState(null);
  const [showRating, setShowRating] = useState(null);
  const [activeTab, setActiveTab] = useState("leaderboard");
  const [notification, setNotification] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  // Real-time subscription for brand updates
  useEffect(() => {
    const unsubscribe = base44.entities.Brand.subscribe((event) => {
      if (event.type === "update" && event.data.is_airing) {
        // Show notification when a brand starts airing
        setNotification(event.data);
        queryClient.invalidateQueries({ queryKey: ["brands"] });
        
        // Auto-dismiss notification after 5 seconds
        setTimeout(() => setNotification(null), 5000);
      }
    });

    return unsubscribe;
  }, [queryClient]);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list("-brand_name", 100),
    refetchInterval: 5000,
  });

  const { data: gameStates = [] } = useQuery({
    queryKey: ["gameState"],
    queryFn: () => base44.entities.GameState.list(),
    refetchInterval: 5000,
  });

  const { data: allPicks = [] } = useQuery({
    queryKey: ["allPicks"],
    queryFn: () => base44.entities.DraftPick.filter({ locked: true }),
    refetchInterval: 10000,
  });

  const { data: myRatings = [] } = useQuery({
    queryKey: ["myRatings", user?.email],
    queryFn: () => base44.entities.Rating.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const gameState = gameStates[0];
  const myPicks = allPicks.filter(p => p.user_email === user?.email);
  const myBrandIds = new Set(myPicks.map(p => p.brand_id));
  const ratedBrandIds = new Set(myRatings.map(r => r.brand_id));

  // Current airing brand
  const airingBrand = brands.find(b => b.is_airing);

  useEffect(() => {
    if (airingBrand && !ratedBrandIds.has(airingBrand.id)) {
      setShowRating(airingBrand);
    }
  }, [airingBrand?.id]);

  const rateMutation = useMutation({
    mutationFn: async ({ brandId, stars }) => {
      const brand = brands.find(b => b.id === brandId);
      await base44.entities.Rating.create({
        user_email: user.email,
        brand_id: brandId,
        brand_name: brand?.brand_name || "",
        stars,
      });
      // Update brand average
      const newTotal = (brand.total_ratings || 0) + 1;
      const newAvg = (((brand.average_rating || 0) * (brand.total_ratings || 0)) + stars) / newTotal;
      const newPoints = Math.round(newAvg * 20) - 10;
      await base44.entities.Brand.update(brandId, {
        average_rating: Math.round(newAvg * 100) / 100,
        total_ratings: newTotal,
        points: newPoints,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRatings"] });
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
  });

  // Calculate leaderboard
  const leaderboard = useMemo(() => {
    const userScores = {};
    const userNames = {};
    const userBrandCounts = {};

    allPicks.forEach(pick => {
      if (!userScores[pick.user_email]) {
        userScores[pick.user_email] = 0;
        userBrandCounts[pick.user_email] = 0;
      }
      userNames[pick.user_email] = pick.user_name;
      userBrandCounts[pick.user_email]++;

      const brand = brands.find(b => b.id === pick.brand_id);
      if (brand && brand.aired) {
        userScores[pick.user_email] += brand.points || 0;
      }
    });

    // Bonus: highest rated ad
    const airedBrands = brands.filter(b => b.aired && b.total_ratings > 0);
    if (airedBrands.length > 0) {
      const topBrand = airedBrands.reduce((best, b) => (b.average_rating || 0) > (best.average_rating || 0) ? b : best);
      Object.entries(userScores).forEach(([email]) => {
        const hasBrand = allPicks.some(p => p.user_email === email && p.brand_id === topBrand.id);
        if (hasBrand) userScores[email] += 25;
      });

      // Bonus: brand with multiple ads
      const brandAdCounts = {};
      airedBrands.forEach(b => { brandAdCounts[b.brand_name] = (brandAdCounts[b.brand_name] || 0) + 1; });
      const multiBrands = Object.keys(brandAdCounts).filter(name => brandAdCounts[name] > 1);
      multiBrands.forEach(brandName => {
        Object.entries(userScores).forEach(([email]) => {
          const hasBrand = allPicks.some(p => p.user_email === email && brands.some(b => b.id === p.brand_id && b.brand_name === brandName));
          if (hasBrand) userScores[email] += 15;
        });
      });
    }

    return Object.entries(userScores)
      .map(([email, score]) => ({ email, name: userNames[email], score, brandCount: userBrandCounts[email] }))
      .sort((a, b) => b.score - a.score);
  }, [allPicks, brands]);

  // Commercials list for rating
  const airedBrands = brands.filter(b => b.aired).sort((a, b) => new Date(b.air_started_at || 0) - new Date(a.air_started_at || 0));
  const unairedBrands = brands.filter(b => !b.aired && !b.is_airing);

  if (!user) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4"
          >
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 border-2 border-white/20 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/90 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img src={notification.logo_url} alt={notification.brand_name} className="w-10 h-10 object-contain" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    <Tv className="w-4 h-4" /> Commercial Alert!
                  </p>
                  <p className="text-white font-bold">{notification.brand_name}</p>
                  <p className="text-white/80 text-sm">{notification.title}</p>
                </div>
                <button
                  onClick={() => {
                    setNotification(null);
                    setShowRating(notification);
                  }}
                  className="px-4 py-2 rounded-xl bg-white text-red-600 font-bold text-sm whitespace-nowrap hover:bg-white/90 transition-colors"
                >
                  Rate Now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
            Commercial Draft
          </h1>
          <GamePhaseIndicator currentPhase={gameState?.phase || "live"} />
        </div>

        {/* Airing Alert */}
        {airingBrand && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30 animate-pulse">
            <div className="flex items-center gap-3">
              <Tv className="w-6 h-6 text-red-400" />
              <div>
                <p className="font-bold text-red-400 text-sm uppercase tracking-wider">Now Airing</p>
                <p className="text-white font-bold text-lg">{airingBrand.brand_name} — {airingBrand.title}</p>
              </div>
              {!myBrandIds.has(airingBrand.id) && !ratedBrandIds.has(airingBrand.id) && (
                <button
                  onClick={() => setShowRating(airingBrand)}
                  className="ml-auto px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-sm whitespace-nowrap"
                >
                  Rate Now →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {["leaderboard", "my_lineup", "commercials", "stats"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                activeTab === tab
                  ? "bg-white/10 text-white border border-white/20"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              {tab === "leaderboard" ? "🏆 Leaderboard" :
               tab === "my_lineup" ? "📋 My Lineup" :
               tab === "commercials" ? "📺 Commercials" : "📊 Stats"}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "leaderboard" && (
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <div className="text-center py-16 text-white/30">
                <p className="text-lg">No scores yet</p>
                <p className="text-sm mt-1">Points will appear as commercials are rated</p>
              </div>
            ) : (
              leaderboard.map((entry, idx) => (
                <LeaderboardRow
                  key={entry.email}
                  rank={idx + 1}
                  userName={entry.name}
                  score={entry.score}
                  isCurrentUser={entry.email === user.email}
                  brandCount={entry.brandCount}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "my_lineup" && (
          <MyLineup picks={myPicks} brands={brands} />
        )}

        {activeTab === "commercials" && (
          <div className="space-y-3">
            {airedBrands.map(brand => {
              const hasRated = ratedBrandIds.has(brand.id);
              const isOwned = myBrandIds.has(brand.id);
              return (
                <div key={brand.id} className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  hasRated || isOwned ? "bg-white/5 border-white/5 opacity-60" : "bg-white/5 border-white/10"
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
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-white text-sm font-bold">{(brand.average_rating || 0).toFixed(1)}</span>
                    </div>
                    {hasRated ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : isOwned ? (
                      <span className="text-xs text-amber-400 font-medium">Owned</span>
                    ) : (
                      <button
                        onClick={() => setShowRating(brand)}
                        className="px-3 py-1 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-500"
                      >
                        Rate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {unairedBrands.length > 0 && (
              <>
                <div className="flex items-center gap-2 mt-6 mb-2">
                  <Clock className="w-4 h-4 text-white/30" />
                  <span className="text-white/30 text-sm font-medium">Upcoming</span>
                </div>
                {unairedBrands.map(brand => (
                  <div key={brand.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] opacity-40">
                    <div className="w-10 h-10 rounded-lg bg-white/90 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img src={brand.logo_url} alt={brand.brand_name} className="w-8 h-8 object-contain"
                        onError={(e) => { e.target.style.display = "none"; e.target.parentElement.innerHTML = `<span class="font-bold text-gray-700">${brand.brand_name?.[0]}</span>`; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{brand.brand_name}</p>
                      <p className="text-white/40 text-xs truncate">{brand.title}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === "stats" && (
          <PostGameStats brands={brands} />
        )}
      </div>

      {/* Rating Popup */}
      <AnimatePresence>
        {showRating && (
          <RatingPopup
            brand={showRating}
            isOwned={myBrandIds.has(showRating.id)}
            onRate={(stars) => {
              rateMutation.mutate({ brandId: showRating.id, stars });
            }}
            onClose={() => setShowRating(null)}
            ratingEndsAt={showRating.air_started_at ? new Date(new Date(showRating.air_started_at).getTime() + 120000).toISOString() : null}
          />
        )}
      </AnimatePresence>
    </div>
  );
}