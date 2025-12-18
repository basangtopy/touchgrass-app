// Design System Constants
// Use these throughout the app for consistency

export const ICON_SIZES = {
  xs: 12, // Inline with small text
  sm: 16, // Small buttons, badges
  md: 20, // Default for most icons
  lg: 24, // Headers, nav icons
  xl: 32, // Feature icons, empty states
  xxl: 48, // Hero sections, large displays
};

export const SPACING = {
  xs: "space-y-2",
  sm: "space-y-3",
  md: "space-y-4",
  lg: "space-y-6",
  xl: "space-y-8",
};

export const TEXT_SIZES = {
  micro: "text-[10px]",
  xs: "text-xs", // 12px - labels, captions
  sm: "text-sm", // 14px - body text
  base: "text-base", // 16px - important body
  lg: "text-lg", // 18px - subheadings
  xl: "text-xl", // 20px - section titles
  "2xl": "text-2xl", // 24px - page titles
  "3xl": "text-3xl", // 30px - hero titles
};

// Typography presets for consistent styling
export const TYPOGRAPHY = {
  pageTitle: "text-2xl font-bold text-white",
  sectionTitle: "text-lg font-semibold text-white",
  sectionLabel:
    "text-sm font-semibold text-emerald-200 uppercase tracking-wider",
  body: "text-sm text-gray-300",
  bodyMuted: "text-xs text-gray-300/70",
  caption: "text-xs text-gray-400",
  micro: "text-[10px] text-gray-400",
};
