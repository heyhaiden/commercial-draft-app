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

export async function getUserIdentity(base44) {
  try {
    const user = await base44.auth.me();
    return {
      id: user.email,
      name: user.full_name,
      isGuest: false
    };
  } catch {
    return {
      id: getGuestId(),
      name: getGuestName(),
      isGuest: true
    };
  }
}