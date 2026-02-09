import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { getUserIdentity } from "@/components/utils/guestAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, Crown } from "lucide-react";
import SeasonScorecard from "@/components/game/SeasonScorecard";

export default function Leaderboard() {
  const [user, setUser] = useState(null);
  const [showScorecard, setShowScorecard] = useState(false);
  const [hasShownScorecard, setHasShownScorecard] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    getUserIdentity(base44).then(setUser);
  }, []);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list(),
  });

  const { data: allPicks = [] } = useQuery({
    queryKey: ["allPicks"],
    queryFn: () => base44.entities.DraftPick.filter({ locked: true }),
  });

  // Real-time sync for brand scores
  useEffect(() => {
    const unsubscribe = base44.entities.Brand.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    });
    return unsubscribe;
  }, [queryClient]);

  // Real-time sync for draft picks
  useEffect(() => {
    const unsubscribe = base44.entities.DraftPick.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["allPicks"] });
    });
    return unsubscribe;
  }, [queryClient]);

  const { data: allPlayers = [] } = useQuery({
    queryKey: ["allPlayers"],
    queryFn: () => base44.entities.Player.list("-created_date", 1000),
  });

  // Memoize leaderboard calculation for performance
  const { leaderboard, myRank, hasAnyRatings } = useMemo(() => {
    // Create brand lookup map for O(1) access
    const brandMap = new Map(brands.map(b => [b.id, b]));

    const userScores = {};
    allPicks.forEach(pick => {
      if (!userScores[pick.user_email]) {
        userScores[pick.user_email] = { name: pick.user_name, score: 0 };
      }
      const brand = brandMap.get(pick.brand_id);
      if (brand?.aired) {
        userScores[pick.user_email].score += brand.points || 0;
      }
    });

    const sorted = Object.entries(userScores)
      .map(([email, data]) => ({ email, ...data }))
      .sort((a, b) => b.score - a.score);

    return {
      leaderboard: sorted,
      myRank: sorted.findIndex(e => e.email === user?.id) + 1,
      hasAnyRatings: brands.some(b => b.aired),
    };
  }, [allPicks, brands, user?.id]);

  // Memoize player lookup map for O(1) access in render
  const playerMap = useMemo(() =>
    new Map(allPlayers.map(p => [p.user_email, p])),
    [allPlayers]
  );

  // Check if all brands have been aired and rated
  const allBrandsAired = brands.length > 0 && brands.every(b => b.aired || b.is_airing === false);
  const isGameComplete = allBrandsAired && brands.filter(b => b.aired).length === brands.length;

  useEffect(() => {
    if (isGameComplete && !hasShownScorecard) {
      setShowScorecard(true);
      setHasShownScorecard(true);
    }
  }, [isGameComplete, hasShownScorecard]);

  const { data: myPicks = [] } = useQuery({
    queryKey: ["myPicks", user?.id],
    queryFn: () => base44.entities.DraftPick.filter({ user_email: user.id, locked: true }),
    enabled: !!user,
  });

  const playerData = user ? {
    displayName: user.name || "Player",
    icon: "🏈",
    rank: myRank,
    picks: myPicks,
  } : null;

  const ICONS = [
    { id: "icon1", emoji: "🏈" },
    { id: "icon2", emoji: "🏆" },
    { id: "icon3", emoji: "⭐" },
    { id: "icon4", emoji: "🔥" },
    { id: "icon5", emoji: "⚡" },
    { id: "icon6", emoji: "👑" },
  ];

  return (
    <div className="min-h-screen bg-[#1d1d0e] text-white pb-24">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black">LIVE SCORING</h1>
        </div>



        {/* Top 3 Podium */}
        {hasAnyRatings && leaderboard.length >= 3 && (
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, idx) => {
              const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
              const heights = ["h-32", "h-40", "h-28"];
              const colors = ["from-gray-400/20", "from-[#f4c542]/20", "from-orange-600/20"];
              const isMe = entry.email === user?.id;
              const player = playerMap.get(entry.email);
              const playerIcon = player?.icon ? ICONS.find(i => i.id === player.icon)?.emoji : "👤";
              return (
                <div key={entry.email} className="flex-1 flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center mb-2 relative ${isMe ? 'ring-4 ring-green-400' : ''}`}>
                    <span className="text-2xl">{playerIcon}</span>
                    {actualRank === 1 && <Crown className="absolute -top-2 -right-2 w-6 h-6 text-[#f4c542]" />}
                  </div>
                  <div className={`w-full ${heights[idx]} rounded-t-2xl bg-gradient-to-b ${colors[idx]} to-transparent border border-[#5a5a4a]/30 border-b-0 flex flex-col items-center justify-center`}>
                    <p className="text-3xl font-black">{actualRank}</p>
                    <p className="text-xs text-[#a4a498] font-bold truncate w-full px-2 text-center">
                      {isMe ? `You (${entry.name?.split(" ")[0]})` : entry.name?.split(" ")[0]}
                    </p>
                    <p className="text-lg font-bold text-[#f4c542]">{entry.score}</p>
                    <p className="text-[10px] text-[#a4a498]">PTS</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Leaderboard List */}
        <div className="space-y-2">
          {!hasAnyRatings && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-[#4a4a3a]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📊</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Waiting for Game to Start</h3>
              <p className="text-[#a4a498] text-sm">Rankings will appear once commercials start airing and players rate them!</p>
            </div>
          )}
          {hasAnyRatings && (
            <>
              <div className="flex items-center justify-between text-[#a4a498] text-xs font-bold mb-2 px-4">
                <span>RANK</span>
                <span>USER</span>
                <span>POINTS</span>
              </div>
              {leaderboard.slice(3).map((entry, idx) => {
            const rank = idx + 4;
            const isMe = entry.email === user?.id;
            const player = playerMap.get(entry.email);
            const playerIcon = player?.icon ? ICONS.find(i => i.id === player.icon)?.emoji : "👤";
            return (
              <div
                key={entry.email}
                className={`rounded-2xl p-4 flex items-center gap-3 ${
                  entry.email === user?.id
                    ? "bg-gradient-to-r from-[#f4c542]/20 to-[#d4a532]/20 border-2 border-[#f4c542]"
                    : "bg-[#2d2d1e] border border-[#5a5a4a]/30"
                }`}
              >
                <div className="w-12 flex items-center justify-center">
                  <p className="text-2xl font-black">{rank}</p>
                </div>
                <div className="flex items-center gap-1 text-green-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center">
                  <span className="text-lg">{playerIcon}</span>
                </div>
                <p className="flex-1 font-bold">{isMe ? `You (${entry.name})` : entry.name}</p>
                <div className="text-right">
                  <p className="text-2xl font-black text-[#f4c542]">{entry.score}</p>
                  <p className="text-[10px] text-[#a4a498]">POINTS</p>
                </div>
              </div>
            );
          })}
            </>
          )}
        </div>
      </div>

      <SeasonScorecard
        show={showScorecard}
        onClose={() => setShowScorecard(false)}
        playerData={playerData}
        brands={brands}
      />
    </div>
  );
}