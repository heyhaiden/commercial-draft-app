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

export async function getUserIdentity(base44) {
  try {
    const user = await base44.auth.me();
    // Store user info in session storage for persistence within the session
    sessionStorage.setItem('currentUser', JSON.stringify({
      id: user.email,
      name: user.full_name,
      isGuest: false
    }));
    return {
      id: user.email,
      name: user.full_name,
      isGuest: false
    };
  } catch (error) {
    // 401/403 errors are expected for guest users - silently handle them
    // Only log unexpected errors
    if (error?.status !== 401 && error?.status !== 403) {
      console.error('Unexpected auth error:', error);
    }
    
    // Try to restore from session storage first
    const cached = sessionStorage.getItem('currentUser');
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
}