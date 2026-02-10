// Guest authentication utilities
export function getGuestId() {
  let guestId = localStorage.getItem('guestId');
  if (!guestId) {
    guestId = 'guest_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('guestId', guestId);
  }
  return guestId;
}

export function getGuestName() {
  let guestName = localStorage.getItem('guestName');
  if (!guestName) {
    guestName = 'Guest' + Math.floor(Math.random() * 9999);
    localStorage.setItem('guestName', guestName);
  }
  return guestName;
}

export function setGuestName(name) {
  localStorage.setItem('guestName', name);
}

// Room session management - scopes data to current game
export function setCurrentRoomCode(roomCode) {
  sessionStorage.setItem('currentRoomCode', roomCode);
}

export function getCurrentRoomCode() {
  return sessionStorage.getItem('currentRoomCode');
}

export function clearCurrentRoom() {
  sessionStorage.removeItem('currentRoomCode');
}

export async function getUserIdentity(base44, skipAuthCheck = false) {
  // Try to restore from session storage first to avoid unnecessary auth calls
  const cached = sessionStorage.getItem('currentUser');
  if (cached) {
    try {
      const cachedUser = JSON.parse(cached);
      // If we have a cached guest user, return it without checking auth
      if (cachedUser.isGuest && skipAuthCheck) {
        return cachedUser;
      }
      // For authenticated users, we still want to verify the session is valid
    } catch {
      // If parsing fails, continue to auth check
    }
  }

  // Only check auth if not explicitly skipping (prevents 401 errors for known guests)
  if (!skipAuthCheck) {
    try {
      const user = await base44.auth.me();
      // Store user info in session storage for persistence within the session
      const authenticatedUser = {
        id: user.email,
        name: user.full_name,
        isGuest: false
      };
      sessionStorage.setItem('currentUser', JSON.stringify(authenticatedUser));
      return authenticatedUser;
    } catch (error) {
      // 401/403 errors are expected for guest users - don't log them
      // Only log unexpected errors
      if (error?.status !== 401 && error?.status !== 403) {
        console.error('Unexpected auth error:', error);
      }
      // Fall through to guest fallback
    }
  }
  
  // Try to restore from session storage
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // If parsing fails, continue to guest fallback
    }
  }
  
  // Fallback to guest
  const guestUser = {
    id: getGuestId(),
    name: getGuestName(),
    isGuest: true
  };
  sessionStorage.setItem('currentUser', JSON.stringify(guestUser));
  return guestUser;
}