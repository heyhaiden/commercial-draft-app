import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle, AlertCircle, Trophy, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import CategorySection from "../components/draft/CategorySection";
import DraftTimer from "../components/draft/DraftTimer";

const MAX_TOTAL = 10;

export default function Draft() {
  const [user, setUser] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [locked, setLocked] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["myPicks"] });
      setTimeout(() => {
        navigate(createPageUrl("Game"));
      }, 3000);
    },
  });

  const totalSelected = selectedIds.length;
  const isComplete = totalSelected === MAX_TOTAL;

  if (!user) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-32">
      {/* Success Screen */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950"
          >
            <div className="text-center px-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
                className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl"
              >
                <Trophy className="w-16 h-16 text-white" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-4xl font-black mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent"
              >
                Draft Locked In!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-white/60 text-lg mb-8"
              >
                Your lineup is set. Get ready to rate!
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex gap-2 justify-center"
              >
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                  >
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              Draft Brands
            </h1>
            <p className="text-white/50 text-sm mt-1">{totalSelected} of {MAX_TOTAL} selected</p>
          </div>
          {gameState?.draft_ends_at && !locked && (
            <DraftTimer endsAt={gameState.draft_ends_at} onExpired={() => {
              if (isComplete) lockMutation.mutate();
            }} />
          )}
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
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/95 backdrop-blur-xl border-t border-white/10 z-40 safe-area-bottom">
            <div className="max-w-7xl mx-auto">
              <div className="mb-3">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    animate={{ width: `${(totalSelected / MAX_TOTAL) * 100}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  />
                </div>
                <p className="text-white/60 text-xs mt-1.5 text-center">
                  {isComplete ? "Ready to lock in!" : `${MAX_TOTAL - totalSelected} more brand${MAX_TOTAL - totalSelected !== 1 ? 's' : ''} needed`}
                </p>
              </div>
              <Button
                onClick={() => lockMutation.mutate()}
                disabled={!isComplete || lockMutation.isPending}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-bold text-lg disabled:opacity-30 shadow-lg shadow-purple-500/20"
              >
                {lockMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Lock In Draft ({totalSelected}/{MAX_TOTAL})
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}