import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { getUserIdentity, getCurrentRoomCode } from "@/components/utils/guestAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import SeasonScorecard from "@/components/game/SeasonScorecard";

export default function Leaderboard() {
  const [user, setUser] = useState(null);
  const [showScorecard, setShowScorecard] = useState(false);
  const [hasShownScorecard, setHasShownScorecard] = useState(false);
  const [currentRoomCode, setCurrentRoomCode] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    getUserIdentity(base44).then(setUser);
  }, []);

  // Get room code from session or find the user's active room
  useEffect(() => {
    async function loadRoomCode() {
      const sessionCode = getCurrentRoomCode();
      if (sessionCode) {
        setCurrentRoomCode(sessionCode);
        return;
      }

      // Fallback: find any active room the user is in
      const userIdentity = await getUserIdentity(base44);
      const playerRecords = await base44.entities.Player.filter({ user_email: userIdentity.id });
      if (playerRecords.length > 0) {
        const activeRoom = playerRecords[0].room_code;
        setCurrentRoomCode(activeRoom);
        setCurrentRoomCode(activeRoom);
      }
    }
    loadRoomCode();
  }, []);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list(),
  });

  const { data: roomBrandStates = [] } = useQuery({
    queryKey: ["roomBrandStates", currentRoomCode],
    queryFn: () => base44.entities.RoomBrandState.filter({ room_code: currentRoomCode }),
    enabled: !!currentRoomCode,
  });

  const { data: allRoomPicks = [] } = useQuery({
    queryKey: ["allRoomPicks", currentRoomCode],
    queryFn: () => base44.entities.RoomDraftPick.filter({ room_code: currentRoomCode }),
    enabled: !!currentRoomCode,
  });

  // Real-time sync for room brand state
  useEffect(() => {
    const unsubscribe = base44.entities.RoomBrandState.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["roomBrandStates"] });
    });
    return unsubscribe;
  }, [queryClient]);

  // Real-time sync for room draft picks
  useEffect(() => {
    const unsubscribe = base44.entities.RoomDraftPick.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["allRoomPicks"] });
    });
    return unsubscribe;
  }, [queryClient]);

  const { data: allPlayers = [] } = useQuery({
    queryKey: ["allPlayers", currentRoomCode],
    queryFn: () => base44.entities.Player.filter({ room_code: currentRoomCode }),
    enabled: !!currentRoomCode,
  });

  // Memoize leaderboard calculation for performance
  const { leaderboard, myRank, hasAnyRatings } = useMemo(() => {
    // Show leaderboard even without picks if there are players
    if (!currentRoomCode) {
      return { leaderboard: [], myRank: 0, hasAnyRatings: false };
    }

    // Create room brand state lookup map for O(1) access
    const stateMap = new Map(roomBrandStates.map(s => [s.brand_id, s]));

    const userScores = {};
    
    // Initialize all players with 0 score, even if they haven't picked yet
    allPlayers.forEach(player => {
      userScores[player.user_email] = {
        name: player.display_name || player.user_email,
        score: 0,
        picks: []
      };
    });

    // Add scores from picks
    allRoomPicks.forEach(pick => {
      if (!userScores[pick.user_email]) {
        const player = allPlayers.find(p => p.user_email === pick.user_email);
        userScores[pick.user_email] = { 
          name: player?.display_name || pick.user_email, 
          score: 0, 
          picks: [] 
        };
      }
      const state = stateMap.get(pick.brand_id);
      userScores[pick.user_email].picks.push({
        brand_name: pick.brand_name,
        points: state?.points || 0,
        aired: state?.aired || false,
        rating: state?.average_rating || 0
      });
      if (state?.aired) {
        userScores[pick.user_email].score += state.points || 0;
      }
    });

    const sorted = Object.entries(userScores)
      .map(([email, data]) => ({ email, ...data }))
      .sort((a, b) => b.score - a.score);

    return {
      leaderboard: sorted,
      myRank: sorted.findIndex(e => e.email === user?.id) + 1,
      hasAnyRatings: roomBrandStates.some(s => s.aired),
    };
  }, [allRoomPicks, roomBrandStates, user?.id, allPlayers, currentRoomCode]);

  // Memoize player lookup map for O(1) access in render
  const playerMap = useMemo(() =>
    new Map(allPlayers.map(p => [p.user_email, p])),
    [allPlayers]
  );

  // Check if all brands have been aired and rated in this room
  const allBrandsAired = brands.length > 0 && brands.length === roomBrandStates.filter(s => s.aired).length;
  const isGameComplete = allBrandsAired;

  useEffect(() => {
    if (isGameComplete && !hasShownScorecard) {
      setShowScorecard(true);
      setHasShownScorecard(true);
    }
  }, [isGameComplete, hasShownScorecard]);

  const { data: myPicks = [] } = useQuery({
    queryKey: ["myPicks", user?.id, currentRoomCode],
    queryFn: () => base44.entities.RoomDraftPick.filter({ 
      user_email: user.id,
      room_code: currentRoomCode 
    }),
    enabled: !!user && !!currentRoomCode,
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
          {leaderboard.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-[#4a4a3a]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📊</span>
              </div>
              <h3 className="text-xl font-bold mb-2">No Players Yet</h3>
              <p className="text-[#a4a498] text-sm">Players will appear here once they join the game room!</p>
            </div>
          )}
          {leaderboard.length > 0 && (
            <>
              <div className="flex items-center justify-between text-[#a4a498] text-xs font-bold mb-2 px-4">
                <span>RANK</span>
                <span>USER</span>
                <span>POINTS</span>
              </div>
              {(hasAnyRatings && leaderboard.length >= 3 ? leaderboard.slice(3) : leaderboard).map((entry, idx) => {
            const rank = hasAnyRatings && leaderboard.length >= 3 ? idx + 4 : idx + 1;
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center">
                  <span className="text-lg">{playerIcon}</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold">{isMe ? `You (${entry.name})` : entry.name}</p>
                  <div className="flex gap-1 mt-1">
                    {entry.picks?.map((pick, i) => (
                      <div key={i} className="text-[10px] text-[#a4a498]" title={`${pick.brand_name}: ${pick.aired ? `${pick.rating}⭐ (${pick.points}pts)` : 'Not aired'}`}>
                        {pick.aired ? `${pick.points}` : '—'}
                      </div>
                    ))}
                  </div>
                </div>
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