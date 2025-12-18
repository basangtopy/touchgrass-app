export const generateMockTxHash = () =>
  "0x" +
  Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");

export const formatTimeRemaining = (targetTime, currentTime = Date.now()) => {
  const diff = targetTime - currentTime;
  if (diff <= 0) return "00h 00m 00s";
  if (diff > 86400000) {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  }
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  return `${h}h ${m}m ${s}s`;
};

export const getLockupDurationMs = (challenge) => {
  if (!challenge || !challenge.durationValue) return 0;
  let durationMs = challenge.durationValue * 5;
  if (challenge.durationUnit === "minutes") durationMs *= 60 * 1000;
  else if (challenge.durationUnit === "hours") durationMs *= 60 * 60 * 1000;
  else if (challenge.durationUnit === "days") durationMs *= 24 * 60 * 60 * 1000;
  return durationMs;
};

export const fetchEthPrice = async () => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    const data = await response.json();
    return data.ethereum.usd;
  } catch (error) {
    return 3000;
  }
};

export const getProofExamples = (activeChallenge) => {
  const title = activeChallenge?.title?.toLowerCase() || "";
  // --- Physical Health ---
  if (
    title.includes("run") ||
    title.includes("walk") ||
    title.includes("hike") ||
    title.includes("steps")
  ) {
    return [
      { icon: "⌚", label: "Watch Stats", desc: "Distance/HR/Steps" },
      { icon: "🗺️", label: "Map Route", desc: "Strava/Fitness App" },
    ];
  }
  if (
    title.includes("gym") ||
    title.includes("workout") ||
    title.includes("lift")
  ) {
    return [
      { icon: "💪", label: "Gym Selfie", desc: "At location" },
      { icon: "📟", label: "Machine Stats", desc: "Treadmill/Bike/Row" },
    ];
  }
  if (title.includes("water") || title.includes("drink")) {
    return [
      { icon: "💧", label: "Empty Bottle", desc: "Container used" },
      { icon: "📱", label: "Tracker App", desc: "Water log entry" },
    ];
  }
  if (
    title.includes("cold") ||
    title.includes("shower") ||
    title.includes("plunge")
  ) {
    return [
      { icon: "🌡️", label: "Temp Gauge", desc: "Water temperature" },
      { icon: "🚿", label: "The Setup", desc: "Bath/Shower photo" },
    ];
  }
  if (title.includes("sleep")) {
    return [
      { icon: "😴", label: "Sleep Score", desc: "Oura/Whoop/Apple" },
      { icon: "⏰", label: "Wake Time", desc: "Alarm log screenshot" },
    ];
  }

  // --- Mental Clarity ---
  if (title.includes("read")) {
    return [
      { icon: "📖", label: "Open Book", desc: "Current page" },
      { icon: "🔖", label: "Bookmark", desc: "Progress shot" },
    ];
  }
  if (title.includes("meditate")) {
    return [
      { icon: "🧘", label: "App Summary", desc: "Headspace/Calm stats" },
      { icon: "⏱️", label: "Timer", desc: "Session duration" },
    ];
  }
  if (title.includes("journal")) {
    return [
      { icon: "✍️", label: "Page Photo", desc: "Handwritten text" },
      { icon: "📓", label: "Notebook", desc: "Open journal/pen" },
    ];
  }
  if (title.includes("sunlight") || title.includes("morning")) {
    return [
      { icon: "☀️", label: "Outdoor View", desc: "Sun/Sky photo" },
      { icon: "⌚", label: "Time/Loc", desc: "Timestamped shot" },
    ];
  }

  // --- Digital Detox ---
  if (
    title.includes("social") ||
    title.includes("media") ||
    title.includes("phone") ||
    title.includes("game")
  ) {
    return [
      { icon: "📉", label: "Screen Time", desc: "Settings dashboard" },
      { icon: "🌳", label: "Real World", desc: "Activity doing instead" },
    ];
  }
  if (title.includes("garden") || title.includes("plant")) {
    return [
      { icon: "🌱", label: "The Plant", desc: "Before/After care" },
      { icon: "🧤", label: "Dirty Hands", desc: "Proof of work" },
    ];
  }

  // --- Productivity ---
  if (title.includes("work") || title.includes("study")) {
    return [
      { icon: "🍅", label: "Pomodoro", desc: "Timer complete" },
      { icon: "💻", label: "Workspace", desc: "Setup view" },
    ];
  }
  if (title.includes("cook") || title.includes("meal")) {
    return [
      { icon: "🍳", label: "The Dish", desc: "Finished meal" },
      { icon: "🥕", label: "Prep", desc: "Chopped ingredients" },
    ];
  }
  if (title.includes("clean") || title.includes("room")) {
    return [
      { icon: "✨", label: "After", desc: "Clean space" },
      { icon: "🧹", label: "Supplies", desc: "Vacuum/Mop/Cloth" },
    ];
  }
  if (title.includes("skill") || title.includes("learn")) {
    return [
      { icon: "🎓", label: "Progress", desc: "App streak/Level" },
      { icon: "🖼️", label: "Result", desc: "Artwork/Code/Craft" },
    ];
  }

  // --- Default Fallback ---
  return [
    { icon: "📸", label: "Clear Photo", desc: "Visible activity" },
    { icon: "🕒", label: "Timestamp", desc: "Time verification" },
  ];
};

// ===== TOKEN FORMATTING UTILITIES =====
import { formatUnits, parseUnits } from "ethers";
import { getTokenDecimals } from "../data/tokenConfig";

/**
 * Format token amount from wei to human-readable string
 * @param {bigint|string} amount - Amount in smallest unit
 * @param {string} symbol - Token symbol (e.g., "ETH", "USDC")
 * @param {number} displayDecimals - Decimal places to show (default: 6)
 * @returns {string} Formatted amount
 */
export const formatTokenAmount = (amount, symbol, displayDecimals = 6) => {
  const decimals = getTokenDecimals(symbol);
  const formatted = formatUnits(amount, decimals);
  return parseFloat(formatted).toFixed(displayDecimals);
};

/**
 * Parse human-readable amount to wei
 * @param {string|number} amount - Human-readable amount
 * @param {string} symbol - Token symbol
 * @returns {bigint} Amount in smallest unit
 */
export const parseTokenAmount = (amount, symbol) => {
  const decimals = getTokenDecimals(symbol);
  return parseUnits(amount.toString(), decimals);
};

/**
 * Format USD value with $ symbol
 * @param {number} value - USD value
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted USD string
 */
export const formatUSD = (value, decimals = 2) => {
  return `$${value.toFixed(decimals)}`;
};
