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

  // Get current room to check room-scoped airing state
  const { data: rooms = [] } = useQuery({
    queryKey: ["room", roomCode],
    queryFn: () => base44.entities.GameRoom.filter({ room_code: roomCode }),
    enabled: !!roomCode,
  });
  const currentRoom = rooms[0];

  // Track the last airing brand to avoid duplicate navigations
  const [lastAiringBrandId, setLastAiringBrandId] = React.useState(null);

  // Listen for room updates (airing state is stored in GameRoom)
  useEffect(() => {
    if (!roomCode) return;
    const unsubscribe = base44.entities.GameRoom.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["room", roomCode] });
    });
    return unsubscribe;
  }, [queryClient, roomCode]);

  // Check for airing brands and navigate to Rate page (room-scoped)
  useEffect(() => {
    if (!roomCode || !currentRoom) return; // Don't navigate if not in a room
    
    const airingBrandId = currentRoom.current_airing_brand_id;
    
    if (airingBrandId && airingBrandId !== lastAiringBrandId) {
      // New brand started airing in this room
      setLastAiringBrandId(airingBrandId);
      
      // Only navigate if we're not already on the Rate page
      const ratePath = createPageUrl("Rate");
      if (location.pathname !== ratePath && location.pathname !== `${ratePath}.html`) {
        navigate(ratePath);
      }
    } else if (!airingBrandId && lastAiringBrandId) {
      // Brand stopped airing, reset tracking
      setLastAiringBrandId(null);
    }
  }, [currentRoom?.current_airing_brand_id, lastAiringBrandId, navigate, location.pathname, roomCode, currentRoom]);

  return null; // This component doesn't render anything
}
