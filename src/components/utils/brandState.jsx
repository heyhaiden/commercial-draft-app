// Room-scoped brand state calculation
export function getRoomBrandStates(brands, roomRatings, roomCode, currentRoom) {
  if (!roomCode || !currentRoom) return brands;

  return brands.map(brand => {
    // Get ratings for this brand from this room only
    const brandRatings = roomRatings.filter(r => r.brand_id === brand.id);
    
    // Calculate average rating
    const average_rating = brandRatings.length > 0
      ? brandRatings.reduce((sum, r) => sum + r.stars, 0) / brandRatings.length
      : 0;
    
    // Calculate points (0-10 based on 1-5 stars)
    const points = average_rating * 2;
    
    // Check if this brand is airing in this room
    const is_airing = currentRoom.current_airing_brand_id === brand.id;
    
    // A brand is aired if it has ratings OR was previously airing but stopped
    const aired = brandRatings.length > 0;
    
    return {
      ...brand,
      is_airing,
      aired,
      average_rating,
      points,
      total_ratings: brandRatings.length
    };
  });
}