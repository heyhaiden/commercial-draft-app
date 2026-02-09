import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tv, Play, Square, CheckCircle, Settings, Users, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Admin() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u.role !== "admin") {
        window.location.href = "/";
      }
      setUser(u);
    }).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list("brand_name", 100),
    refetchInterval: 3000,
  });

  const { data: gameStates = [] } = useQuery({
    queryKey: ["gameState"],
    queryFn: () => base44.entities.GameState.list(),
  });

  const { data: allPicks = [] } = useQuery({
    queryKey: ["allPicks"],
    queryFn: () => base44.entities.DraftPick.filter({ locked: true }),
  });

  const { data: allRatings = [] } = useQuery({
    queryKey: ["allRatings"],
    queryFn: () => base44.entities.Rating.list("-created_date", 500),
  });

  const gameState = gameStates[0];

  const updatePhaseMutation = useMutation({
    mutationFn: async (phase) => {
      if (gameState) {
        await base44.entities.GameState.update(gameState.id, { phase });
      } else {
        await base44.entities.GameState.create({ phase });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameState"] });
      toast.success("Game phase updated");
    },
  });

  const startDraftMutation = useMutation({
    mutationFn: async () => {
      const endsAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
      if (gameState) {
        await base44.entities.GameState.update(gameState.id, { phase: "drafting", draft_ends_at: endsAt });
      } else {
        await base44.entities.GameState.create({ phase: "drafting", draft_ends_at: endsAt });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameState"] });
      toast.success("Draft started! 2 minute timer running.");
    },
  });

  const airCommercialMutation = useMutation({
    mutationFn: async (brandId) => {
      // Stop any currently airing
      const currentlyAiring = brands.filter(b => b.is_airing);
      for (const b of currentlyAiring) {
        await base44.entities.Brand.update(b.id, { is_airing: false, aired: true });
      }
      // Start new one
      await base44.entities.Brand.update(brandId, {
        is_airing: true,
        aired: false,
        air_started_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Commercial is now airing!");
    },
  });

  const stopAiringMutation = useMutation({
    mutationFn: async (brandId) => {
      await base44.entities.Brand.update(brandId, { is_airing: false, aired: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Commercial stopped");
    },
  });

  const uniqueUsers = new Set(allPicks.map(p => p.user_email)).size;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#3d3d2e] text-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-6 h-6 text-[#f4c542]" />
          <h1 className="text-2xl font-black text-white">Admin Control Panel</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Players", value: uniqueUsers, icon: Users },
            { label: "Brands", value: brands.length, icon: Tv },
            { label: "Aired", value: brands.filter(b => b.aired).length, icon: CheckCircle },
            { label: "Ratings", value: allRatings.length, icon: BarChart3 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="p-4 rounded-2xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30">
              <Icon className="w-5 h-5 text-[#f4c542] mb-2" />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-[#a4a498] text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* Game Phase Control */}
        <div className="p-4 rounded-2xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30 mb-6">
          <h2 className="font-bold text-lg mb-4">Game Phase</h2>
          <div className="flex flex-wrap gap-2">
            {["pre_draft", "drafting", "pre_game", "live", "post_game"].map(phase => (
              <Button
                key={phase}
                variant={gameState?.phase === phase ? "default" : "outline"}
                onClick={() => phase === "drafting" ? startDraftMutation.mutate() : updatePhaseMutation.mutate(phase)}
                className={cn(
                  "rounded-xl border-[#5a5a4a]/30",
                  gameState?.phase === phase && "bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e]"
                )}
              >
                {phase.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </Button>
            ))}
          </div>
        </div>

        {/* Commercial Air Control */}
        <div className="p-4 rounded-2xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30">
          <h2 className="font-bold text-lg mb-4">Commercial Control</h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {brands.map(brand => (
              <div key={brand.id} className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                brand.is_airing ? "bg-red-500/20 border-red-400/50" :
                brand.aired ? "bg-green-500/10 border-green-400/30 opacity-60" :
                "bg-[#2d2d1e] border-[#5a5a4a]/30"
              )}>
                <div className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img src={brand.logo_url} alt={brand.brand_name} className="w-6 h-6 object-contain"
                    onError={(e) => { e.target.style.display = "none"; e.target.parentElement.innerHTML = `<span class="text-xs font-bold text-gray-700">${brand.brand_name?.[0]}</span>`; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{brand.brand_name}</p>
                  <p className="text-white/40 text-xs truncate">{brand.title}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {brand.aired && (
                    <span className="text-xs text-white/40">⭐ {(brand.average_rating || 0).toFixed(1)} ({brand.total_ratings || 0})</span>
                  )}
                  {brand.is_airing ? (
                    <Button size="sm" variant="destructive" onClick={() => stopAiringMutation.mutate(brand.id)} className="rounded-lg">
                      <Square className="w-3 h-3 mr-1" /> Stop
                    </Button>
                  ) : !brand.aired ? (
                    <Button size="sm" onClick={() => airCommercialMutation.mutate(brand.id)} className="rounded-lg bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e]">
                      <Play className="w-3 h-3 mr-1" /> Air
                    </Button>
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}