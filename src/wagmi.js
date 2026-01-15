import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  baseAccount,
  walletConnectWallet,
  rainbowWallet,
  trustWallet,
  rabbyWallet,
} from "@rainbow-me/rainbowkit/wallets";
// Note: @farcaster/miniapp-wagmi-connector removed due to version incompatibility
// Mini app detection and features handled via useMiniApp hook instead
import { createConfig, http } from "wagmi";
import { base, baseSepolia, hardhat } from "wagmi/chains";

// Get chains based on environment
// - Production: Base mainnet only
// - Development: Base, Base Sepolia, and local Hardhat
const isDev = import.meta.env.DEV;
const chains = isDev ? [base, baseSepolia, hardhat] : [baseSepolia, base];

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Configure wallet connectors with injectedWallet first for in-app browser detection
// injectedWallet catches ANY wallet's dApp browser (Trust, SafePal, Zerion, etc.)
// In Base App/Farcaster context, injectedWallet will catch the injected wallet
const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [
        injectedWallet, // Catches any in-app browser wallet (including Base App)
        metaMaskWallet,
        baseAccount,
        walletConnectWallet,
        rainbowWallet,
        trustWallet,
        rabbyWallet,
      ],
    },
  ],
  {
    appName: "TouchGrass",
    projectId,
  }
);

export const config = createConfig({
  connectors,
  chains,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    ...(isDev && { [hardhat.id]: http() }),
  },
  ssr: false,
});
