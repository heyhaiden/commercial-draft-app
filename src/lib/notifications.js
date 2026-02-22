let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// Resume audio context on first user interaction (required for iOS)
if (typeof window !== "undefined") {
  const resume = () => {
    if (audioCtx?.state === "suspended") audioCtx.resume();
    window.removeEventListener("touchstart", resume);
    window.removeEventListener("click", resume);
  };
  window.addEventListener("touchstart", resume, { once: true });
  window.addEventListener("click", resume, { once: true });
}

export function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function sendBrowserNotification(title, body) {
  if (
    "Notification" in window &&
    Notification.permission === "granted" &&
    document.hidden
  ) {
    const notification = new Notification(title, {
      body,
      tag: "commercial-alert",
      renotify: true,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return notification;
  }
  return null;
}

export function playAlertSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    // Two-tone chime
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.type = "sine";
    osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.15); // G5
    osc2.type = "sine";

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.5);
  } catch {
    // Audio not available
  }
}
