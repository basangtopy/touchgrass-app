// Haptic Feedback Utility for Mobile Users
// Provides tactile feedback on touch interactions

export const haptic = {
  // Light tap - for button presses, selections
  light: () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  },

  // Medium tap - for important actions
  medium: () => {
    if (navigator.vibrate) {
      navigator.vibrate(25);
    }
  },

  // Success pattern - for completed actions
  success: () => {
    if (navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }
  },

  // Error pattern - for failed actions
  error: () => {
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50, 30, 50]);
    }
  },

  // Warning pattern - for alerts
  warning: () => {
    if (navigator.vibrate) {
      navigator.vibrate([40, 40, 40]);
    }
  },

  // Heavy impact - for significant actions (staking, withdrawing)
  heavy: () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  },
};

// Check if haptic feedback is supported
export const isHapticSupported = () => {
  return "vibrate" in navigator;
};

export default haptic;
