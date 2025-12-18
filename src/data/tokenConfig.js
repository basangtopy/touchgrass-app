/**
 * Token Configuration Module
 * Centralized token settings for multi-token support
 */

// ERC20 ABI for balance/allowance checks
export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function symbol() view returns (string)",
];

// Known token configurations (validated at runtime against contract)
export const TOKEN_CONFIG = {
  ETH: {
    symbol: "ETH",
    decimals: 18,
    address: null, // Native ETH
    icon: "Ξ",
    color: "purple",
    isNative: true,
  },
  USDC: {
    symbol: "USDC",
    decimals: 6,
    address: import.meta.env.VITE_USDC_ADDRESS,
    icon: "$",
    color: "blue",
    isNative: false,
  },
  // Future tokens can be added here
  // DAI: { symbol: "DAI", decimals: 18, address: "0x...", icon: "◈", color: "yellow", isNative: false },
};

// Helper: Get token config (returns undefined if not found)
export const getTokenConfig = (symbol) => TOKEN_CONFIG[symbol];

// Helper: Get decimals for a token
export const getTokenDecimals = (symbol) =>
  TOKEN_CONFIG[symbol]?.decimals ?? 18;

// Helper: Get token address (null for native ETH)
export const getTokenAddress = (symbol) =>
  TOKEN_CONFIG[symbol]?.address ?? null;

// Helper: Check if token is native (ETH)
export const isNativeToken = (symbol) =>
  TOKEN_CONFIG[symbol]?.isNative ?? false;

// Helper: Get all known token symbols
export const getKnownTokenSymbols = () => Object.keys(TOKEN_CONFIG);

// Helper: Get token display icon
export const getTokenIcon = (symbol) => TOKEN_CONFIG[symbol]?.icon ?? symbol;

// Helper: Get styling color class
export const getTokenColorClass = (symbol) => {
  const color = TOKEN_CONFIG[symbol]?.color ?? "gray";
  return `bg-${color}-600`;
};
