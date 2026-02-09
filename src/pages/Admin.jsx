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
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
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

  const { data: rooms = [] } = useQuery({
    queryKey: ["gameRooms"],
    queryFn: () => base44.entities.GameRoom.list("-created_date", 1),
  });

  const filteredBrands = brands.filter(b => {
    const matchesSearch = b.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         b.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || 
                         (filter === "aired" && b.aired) ||
                         (filter === "pending" && !b.aired && !b.is_airing) ||
                         (filter === "airing" && b.is_airing);
    return matchesSearch && matchesFilter;
  });

  const shareRoomCode = () => {
    if (rooms[0]?.room_code) {
      navigator.clipboard.writeText(rooms[0].room_code);
      toast.success("Room code copied!");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#3d3d2e] text-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-[#f4c542]" />
            <h1 className="text-2xl font-black text-white">Admin Control Panel</h1>
          </div>
          {rooms[0] && (
            <button
              onClick={shareRoomCode}
              className="px-4 py-2 rounded-xl bg-[#4a4a3a]/40 hover:bg-[#5a5a4a]/40 text-[#f4c542] font-bold text-lg flex items-center gap-2"
            >
              <span className="text-2xl">{rooms[0].room_code}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Players", value: uniqueUsers },
            { label: "Aired", value: brands.filter(b => b.aired).length },
            { label: "Left", value: brands.filter(b => !b.aired && !b.is_airing).length },
          ].map(({ label, value }) => (
            <div key={label} className="p-4 rounded-2xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30 text-center">
              <p className="text-3xl font-black text-[#f4c542]">{value}</p>
              <p className="text-[#a4a498] text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Commercial Air Control */}
        <div className="rounded-2xl bg-[#4a4a3a]/20 border border-[#5a5a4a]/30 p-4">
          <h2 className="font-bold text-lg mb-4">Commercial Control</h2>
          
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl bg-[#2d2d1e] border border-[#5a5a4a]/30 text-white placeholder-[#a4a498]"
            />
            <div className="flex gap-2">
              {["all", "pending", "aired", "airing"].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl font-medium text-sm capitalize transition-all ${
                    filter === f
                      ? "bg-gradient-to-r from-[#f4c542] to-[#d4a532] text-[#2d2d1e]"
                      : "bg-[#2d2d1e] text-[#a4a498] hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredBrands.map(brand => (
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