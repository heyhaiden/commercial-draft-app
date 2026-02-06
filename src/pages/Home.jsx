import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Tv, Trophy, Star, ArrowRight, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import GamePhaseIndicator from "../components/common/GamePhaseIndicator";

export default function Home() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setAuthChecked(true); }).catch(() => setAuthChecked(true));
  }, []);

  const { data: gameStates = [] } = useQuery({
    queryKey: ["gameState"],
    queryFn: () => base44.entities.GameState.list(),
    refetchInterval: 5000,
  });

  const { data: allPicks = [] } = useQuery({
    queryKey: ["allPicks"],
    queryFn: () => base44.entities.DraftPick.filter({ locked: true }),
  });

  const gameState = gameStates[0];
  const uniquePlayers = new Set(allPicks.map(p => p.user_email)).size;
  const myPicks = user ? allPicks.filter(p => p.user_email === user.email) : [];
  const hasLocked = myPicks.length > 0;

  const getActionLink = () => {
    if (!user) return null;
    if (gameState?.phase === "live" || gameState?.phase === "post_game") return createPageUrl("Game");
    if (hasLocked) return createPageUrl("Game");
    return createPageUrl("Draft");
  };

  const getActionText = () => {
    if (!user) return "Sign In to Play";
    if (gameState?.phase === "live") return "Join Game →";
    if (gameState?.phase === "post_game") return "See Results →";
    if (hasLocked) return "View My Lineup →";
    return "Start Drafting →";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-pink-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Phase Indicator */}
        {gameState && (
          <div className="flex justify-center mb-8">
            <GamePhaseIndicator currentPhase={gameState.phase} />
          </div>
        )}

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 mb-6">
            <Tv className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-white/70">Super Bowl LX • 2026</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black leading-tight mb-4">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              Commercial
            </span>
            <br />
            <span className="text-white">Draft</span>
          </h1>

          <p className="text-lg text-white/50 max-w-md mx-auto mb-8">
            Draft the brands. Rate the ads. Win the Big Game.
          </p>

          {authChecked && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {user ? (
                <Link to={getActionLink()}>
                  <Button className="h-14 px-10 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-bold text-lg shadow-xl shadow-purple-500/20">
                    {getActionText()}
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="h-14 px-10 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-bold text-lg shadow-xl shadow-purple-500/20"
                >
                  Sign In to Play
                </Button>
              )}

              {user?.role === "admin" && (
                <Link to={createPageUrl("Admin")}>
                  <Button variant="outline" className="h-14 px-8 rounded-2xl border-white/20 text-white hover:bg-white/10">
                    Admin Panel
                  </Button>
                </Link>
              )}
            </div>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-3 mb-12"
        >
          {[
            { icon: Users, label: "Players", value: uniquePlayers },
            { icon: Star, label: "Brands", value: "36" },
            { icon: Trophy, label: "Max Points", value: "900+" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Icon className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-white/40 text-xs">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-center text-xl font-bold mb-6 text-white/80">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "01", title: "Draft 10 Brands", desc: "Pick 2 brands per category you think will have the best Super Bowl ads.", icon: "🎯" },
              { step: "02", title: "Rate Commercials", desc: "As ads air during the game, rate each one 1-5 stars. You can't rate your own brands.", icon: "⭐" },
              { step: "03", title: "Win the Draft", desc: "Points are based on crowd ratings of your brands. Highest score wins!", icon: "🏆" },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <span className="text-3xl mb-3 block">{icon}</span>
                <p className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">Step {step}</p>
                <h3 className="font-bold text-white mb-1">{title}</h3>
                <p className="text-white/40 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Scoring */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="p-6 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm"
        >
          <h2 className="text-center text-xl font-bold mb-4 text-white/80">Scoring</h2>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {[
              { stars: 1, pts: 10, color: "from-red-500/20 to-red-500/5" },
              { stars: 2, pts: 30, color: "from-orange-500/20 to-orange-500/5" },
              { stars: 3, pts: 50, color: "from-yellow-500/20 to-yellow-500/5" },
              { stars: 4, pts: 70, color: "from-green-500/20 to-green-500/5" },
              { stars: 5, pts: 90, color: "from-purple-500/20 to-purple-500/5" },
            ].map(({ stars, pts, color }) => (
              <div key={stars} className={`text-center p-3 rounded-xl bg-gradient-to-b ${color} border border-white/5`}>
                <div className="flex justify-center gap-0.5 mb-1">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-white font-bold text-lg">{pts}</p>
                <p className="text-white/30 text-xs">pts</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 text-center text-sm">
            <div className="flex-1 p-2 rounded-lg bg-amber-500/10 border border-amber-400/20">
              <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-amber-400 font-medium">+25 bonus</p>
              <p className="text-white/40 text-xs">if you drafted the top-rated ad</p>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-blue-500/10 border border-blue-400/20">
              <Zap className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-blue-400 font-medium">+15 bonus</p>
              <p className="text-white/40 text-xs">for brands with multiple ads</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}