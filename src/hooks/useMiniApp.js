import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useState, useCallback, useRef } from "react";
import { useConnect, useAccount } from "wagmi";

export function useMiniApp() {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [miniAppContext, setMiniAppContext] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const readyCalled = useRef(false);
  const autoConnectAttempted = useRef(false);

  // Wagmi hooks for auto-connect
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  // Initialize mini app detection
  useEffect(() => {
    const initMiniApp = async () => {
      try {
        // Fast check first
        const inMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(inMiniApp);

        if (inMiniApp) {
          const context = await sdk.context;
          setMiniAppContext(context);

          // Signal ready AFTER paint completes to avoid blank screen
          if (!readyCalled.current) {
            readyCalled.current = true;
            requestAnimationFrame(() => {
              sdk.actions.ready().catch(console.debug);
            });
          }
        }
      } catch (error) {
        console.debug("Not in mini app context");
      } finally {
        setIsReady(true);
      }
    };

    initMiniApp();
  }, []);

  // Auto-connect wallet when in mini app context
  useEffect(() => {
    if (isInMiniApp && !isConnected && !autoConnectAttempted.current) {
      autoConnectAttempted.current = true;

      // Find the injected wallet connector (Base App injects its wallet)
      const injectedConnector = connectors.find(
        (c) => c.id === "injected" || c.type === "injected"
      );

      if (injectedConnector) {
        // Small delay to ensure the wallet is ready
        setTimeout(() => {
          connect({ connector: injectedConnector });
        }, 500);
      }
    }
  }, [isInMiniApp, isConnected, connect, connectors]);

  // Farcaster compose cast with fallback
  const share = useCallback(
    async (text, url) => {
      if (isInMiniApp) {
        try {
          await sdk.actions.composeCast({
            text,
            embeds: url ? [{ url }] : [],
          });
          return { success: true, method: "farcaster" };
        } catch (e) {
          console.error("composeCast failed:", e);
        }
      }
      return { success: false, method: "fallback" };
    },
    [isInMiniApp]
  );

  // Haptic feedback
  const haptic = useCallback(
    (type = "medium") => {
      if (isInMiniApp && sdk.haptics) {
        try {
          sdk.haptics.impactOccurred(type);
        } catch {
          // Haptics not available
        }
      }
    },
    [isInMiniApp]
  );

  return { isInMiniApp, miniAppContext, isReady, share, haptic };
}
