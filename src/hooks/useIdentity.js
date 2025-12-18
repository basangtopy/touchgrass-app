import { useState, useEffect, useMemo } from "react";
import { useName } from "@coinbase/onchainkit/identity";
import { useEnsName, useEnsAvatar } from "wagmi";
import { mainnet } from "wagmi/chains";

/**
 * Enhanced Social Identity Hook
 * Priority: Farcaster -> Base Name -> ENS -> Shortened Address
 * Returns: { name, avatar, source }
 */
export function useIdentity(address) {
  const [farcasterProfile, setFarcasterProfile] = useState(null);

  // 1. Base Name (OnchainKit)
  const { data: baseName } = useName({ address: address });

  // 2. ENS Name & Avatar (Wagmi - Mainnet)
  const { data: ensName } = useEnsName({
    address: address,
    chainId: mainnet.id,
  });
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName,
    chainId: mainnet.id,
  });

  // 3. Farcaster Fetcher (Neynar API)
  useEffect(() => {
    if (!address) return;

    const fetchFarcaster = async () => {
      try {
        // You need a generic API proxy or Neynar Key here.
        // Ideally, route this through your server/index.js to hide the API Key.
        // For demo, we assume a public endpoint or env var.
        const NEYNAR_API_KEY = import.meta.env.VITE_NEYNAR_API_KEY;

        if (!NEYNAR_API_KEY) return;

        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
          {
            method: "GET",
            headers: { accept: "application/json", api_key: NEYNAR_API_KEY },
          }
        );

        const data = await response.json();
        const user = data[address.toLowerCase()]?.[0];

        if (user) {
          setFarcasterProfile({
            name: user.display_name || user.username,
            avatar: user.pfp_url,
            source: "farcaster",
          });
        }
      } catch (e) {
        console.warn("Farcaster fetch failed:", e);
      }
    };

    fetchFarcaster();
  }, [address]);

  // 4. Resolve Final Identity
  return useMemo(() => {
    if (!address) return { name: "...", avatar: null, source: null };

    // Priority 1: Farcaster (Rich Social Data)
    if (farcasterProfile) {
      return farcasterProfile;
    }

    // Priority 2: Base Name (Native)
    if (baseName) {
      return {
        name: baseName,
        avatar: null, // Base avatars usually need a separate fetch or generic blockie
        source: "base",
      };
    }

    // Priority 3: ENS (Standard)
    if (ensName) {
      return {
        name: ensName,
        avatar: ensAvatar,
        source: "ens",
      };
    }

    // Fallback: Address
    return {
      name: `${address.slice(0, 5)}...${address.slice(-3)}`,
      avatar: null,
      source: "address",
    };
  }, [address, farcasterProfile, baseName, ensName, ensAvatar]);
}
