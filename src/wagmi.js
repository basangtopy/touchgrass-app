import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia, hardhat } from "wagmi/chains";

// Get chains based on environment
// - Production: Base mainnet only
// - Development: Base, Base Sepolia, and local Hardhat
const isDev = import.meta.env.DEV;
const chains = isDev ? [base, baseSepolia, hardhat] : [baseSepolia, base];

export const config = getDefaultConfig({
  appName: "TouchGrass",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains,
  ssr: false,
});
