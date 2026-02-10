/**
 * Utility functions for calculating room-scoped brand state
 * Brands are global, but their state (aired, points, ratings) is room-specific
 */

/**
 * Calculate brand state for a specific room
 * @param {Object} brand - The brand entity
 * @param {Array} roomRatings - All ratings for this room (filtered by roomCode: prefix)
 * @param {string} roomCode - The room code
 * @param {Object} room - The GameRoom entity (contains current_airing_brand_id, air_started_at)
 * @returns {Object} Brand state for this room
 */
export function getRoomBrandState(brand, roomRatings, roomCode, room) {
  // Get ratings for this specific brand in this room
  const brandRatings = roomRatings.filter(r => r.brand_id === brand.id);
  
  // Check if this brand is currently airing in this room
  const isAiring = room?.current_airing_brand_id === brand.id;
  
  // Check if brand has been aired (has ratings - completely room-scoped)
  const hasRatings = brandRatings.length > 0;
  const aired = hasRatings; // Only aired if it has ratings in this room
  
  // Calculate average rating and points from room-scoped ratings
  let averageRating = 0;
  let points = 0;
  let totalRatings = brandRatings.length;
  
  if (brandRatings.length > 0) {
    const totalStars = brandRatings.reduce((sum, r) => sum + r.stars, 0);
    averageRating = totalStars / brandRatings.length;
    points = Math.round(averageRating * 20) - 10;
  }
  
  return {
    ...brand,
    is_airing: isAiring,
    aired: aired && hasRatings, // Only aired if it has ratings
    average_rating: Math.round(averageRating * 100) / 100,
    total_ratings: totalRatings,
    points: points,
    air_started_at: isAiring ? room?.air_started_at : null,
  };
}

/**
 * Get all room-scoped brand states
 * @param {Array} brands - All brands
 * @param {Array} roomRatings - All ratings for this room
 * @param {string} roomCode - The room code
 * @param {Object} room - The GameRoom entity
 * @returns {Array} Brands with room-scoped state
 */
export function getRoomBrandStates(brands, roomRatings, roomCode, room) {
  if (!brands || !Array.isArray(brands)) return [];
  if (!roomRatings) roomRatings = [];
  if (!roomCode || !room) return brands.map(brand => ({ ...brand, is_airing: false, aired: false, average_rating: 0, total_ratings: 0, points: 0 }));
  return brands.map(brand => getRoomBrandState(brand, roomRatings, roomCode, room));
}
