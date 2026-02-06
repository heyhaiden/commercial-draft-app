import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import CategorySection from "../components/draft/CategorySection";
import DraftTimer from "../components/draft/DraftTimer";
import GamePhaseIndicator from "../components/common/GamePhaseIndicator";

const MAX_TOTAL = 10;

export default function Draft() {
  const [user, setUser] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [locked, setLocked] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list("-brand_name", 100),
  });

  const { data: gameStates = [] } = useQuery({
    queryKey: ["gameState"],
    queryFn: () => base44.entities.GameState.list(),
  });

  const { data: myPicks = [] } = useQuery({
    queryKey: ["myPicks", user?.email],
    queryFn: () => base44.entities.DraftPick.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const gameState = gameStates[0];

  useEffect(() => {
    if (myPicks.length > 0 && myPicks[0].locked) {
      setLocked(true);
      setSelectedIds(myPicks.map(p => p.brand_id));
    }
  }, [myPicks]);

  const categories = ["Tech", "Auto", "Food & Beverage", "Entertainment", "Other"];

  const handleToggle = (brand) => {
    if (locked) return;
    setSelectedIds(prev => {
      if (prev.includes(brand.id)) {
        return prev.filter(id => id !== brand.id);
      }
      if (prev.length >= MAX_TOTAL) {
        toast.error("Maximum 10 brands. Remove one first.");
        return prev;
      }
      return [...prev, brand.id];
    });
  };

  const lockMutation = useMutation({
    mutationFn: async () => {
      // Delete existing picks
      if (myPicks.length > 0) {
        for (const pick of myPicks) {
          await base44.entities.DraftPick.delete(pick.id);
        }
      }
      // Create new picks
      const picksData = selectedIds.map(id => {
        const brand = brands.find(b => b.id === id);
        return {
          user_email: user.email,
          user_name: user.full_name || user.email,
          brand_id: id,
          brand_name: brand.brand_name,
          category: brand.category,
          locked: true,
        };
      });
      await base44.entities.DraftPick.bulkCreate(picksData);
    },
    onSuccess: () => {
      setLocked(true);
      queryClient.invalidateQueries({ queryKey: ["myPicks"] });
      toast.success("Draft locked in! Good luck! 🎉");
    },
  });

  const totalSelected = selectedIds.length;
  const isComplete = totalSelected === MAX_TOTAL;

  if (!user) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              Commercial Draft
            </h1>
            <p className="text-white/50 mt-1">Pick your 10 favorite brands</p>
          </div>
          <div className="flex items-center gap-3">
            {gameState?.draft_ends_at && !locked && (
              <DraftTimer endsAt={gameState.draft_ends_at} onExpired={() => {
                if (isComplete) lockMutation.mutate();
              }} />
            )}
            <GamePhaseIndicator currentPhase={gameState?.phase || "drafting"} />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">{totalSelected}/{MAX_TOTAL} brands selected</span>
            {locked && (
              <span className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
                <Lock className="w-4 h-4" /> Draft Locked
              </span>
            )}
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              animate={{ width: `${(totalSelected / MAX_TOTAL) * 100}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-8">
          {categories.map(cat => {
            const catBrands = brands.filter(b => b.category === cat);
            if (catBrands.length === 0) return null;
            return (
              <CategorySection
                key={cat}
                category={cat}
                brands={catBrands}
                selectedIds={selectedIds}
                onToggle={handleToggle}
              />
            );
          })}
        </div>

        {/* Lock In Button */}
        {!locked && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/90 backdrop-blur-xl border-t border-white/10 z-40">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div>
                {!isComplete && (
                  <p className="text-amber-400 text-sm flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Select {MAX_TOTAL - totalSelected} more brand{MAX_TOTAL - totalSelected !== 1 && 's'}
                  </p>
                )}
                {isComplete && (
                  <p className="text-green-400 text-sm flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    Ready to lock in!
                  </p>
                )}
              </div>
              <Button
                onClick={() => lockMutation.mutate()}
                disabled={!isComplete || lockMutation.isPending}
                className="h-12 px-8 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-bold text-lg disabled:opacity-30 shadow-lg shadow-purple-500/20"
              >
                {lockMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Lock In Draft
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {locked && (
          <div className="mt-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex flex-col items-center gap-3 p-8 rounded-3xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/20"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-3xl">🏈</span>
              </div>
              <h3 className="text-xl font-bold text-green-400">Draft Complete!</h3>
              <p className="text-white/50">Your lineup is locked in. Head to the game view when commercials start airing.</p>
            </motion.div>
          </div>
        )}

        {/* Spacer for fixed bottom bar */}
        {!locked && <div className="h-24" />}
      </div>
    </div>
  );
}