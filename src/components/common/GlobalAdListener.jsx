import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { getCurrentRoomCode } from "@/components/utils/guestAuth";

export default function GlobalAdListener() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const roomCode = getCurrentRoomCode();

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list(),
    enabled: !!roomCode, // Only run when in a game room
  });

  // Track the last airing brand to avoid duplicate navigations
  const [lastAiringBrandId, setLastAiringBrandId] = React.useState(null);

  // Listen for brand updates
  useEffect(() => {
    const unsubscribe = base44.entities.Brand.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    });
    return unsubscribe;
  }, [queryClient]);

  // Check for airing brands and navigate to Rate page
  useEffect(() => {
    if (!roomCode) return; // Don't navigate if not in a room
    
    const airingBrand = brands.find(b => b.is_airing);
    
    if (airingBrand && airingBrand.id !== lastAiringBrandId) {
      // New brand started airing
      setLastAiringBrandId(airingBrand.id);
      
      // Only navigate if we're not already on the Rate page
      const ratePath = createPageUrl("Rate");
      if (location.pathname !== ratePath && location.pathname !== `${ratePath}.html`) {
        navigate(ratePath);
      }
    } else if (!airingBrand && lastAiringBrandId) {
      // Brand stopped airing, reset tracking
      setLastAiringBrandId(null);
    }
  }, [brands, lastAiringBrandId, navigate, location.pathname, roomCode]);

  return null; // This component doesn't render anything
}
