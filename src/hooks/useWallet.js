import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useEthersSigner } from "../utils/ethersAdapter";
import { useIdentity } from "./useIdentity";

/**
 * useWallet - Manages wallet connection state and derived values
 *
 * This hook wraps wagmi hooks and provides a unified interface for
 * wallet connection, address, identity, and signer access.
 *
 * NOTE: Navigation on disconnect is handled in App.jsx to avoid
 * importing router hooks into this hook.
 */
export function useWallet() {
  // WAGMI hooks
  const { address, isConnected } = useAccount();
  useDisconnect(); // Keep hook mounted
  const signer = useEthersSigner();

  // Identity (basename, ENS, Farcaster)
  const identity = useIdentity(address);
  const displayName = identity.name;

  // Local synced state
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [basename, setBasename] = useState(null);

  // Sync wagmi state to local state
  useEffect(() => {
    setWalletConnected(isConnected);
    if (isConnected && address) {
      setWalletAddress(address.toLowerCase());
      setBasename(displayName);
    } else {
      setWalletAddress(null);
      setBasename(null);
    }
  }, [isConnected, address, displayName]);

  return {
    // Connection state
    walletConnected,
    walletAddress,
    basename,
    signer,

    // Raw wagmi values (if needed)
    address,
    isConnected,
  };
}
