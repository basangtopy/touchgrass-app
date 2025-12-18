import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";

export const HeaderConnectButton = (displayName) => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              // STATE 1: Disconnected (Connect Wallet)

              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="flex items-center gap-2 px-4 py-1.5 bg-emerald-900/30 rounded-full border border-emerald-500/20 hover:bg-emerald-900/50 transition-colors cursor-pointer group"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500/50 group-hover:bg-emerald-400 group-hover:shadow-[0_0_8px_rgba(52,211,153,0.6)] transition-all"></div>
                    <span className="text-sm font-mono text-emerald-400 font-semibold">
                      Connect Wallet
                    </span>
                  </button>
                );
              }

              // STATE 2: Wrong Network

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="flex items-center gap-2 px-4 py-1.5 bg-red-900/30 rounded-full border border-red-500/20 hover:bg-red-900/50 transition-colors cursor-pointer"
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-sm font-mono text-red-400 font-semibold">
                      Wrong Network
                    </span>
                  </button>
                );
              }

              // STATE 3: Connected

              return (
                <button
                  onClick={openAccountModal}
                  type="button"
                  className="flex items-center gap-2 px-4 py-1.5 bg-emerald-900/30 rounded-full border border-emerald-500/20 hover:bg-emerald-900/50 transition-colors cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-sm font-mono text-emerald-400 font-semibold">
                    {displayName}
                  </span>
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export const HomeConnectButton = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // 1. Ensure the component is mounted and ready
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            className="w-full"
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              // STATE 1: Disconnected (Custom Button)
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="w-full mb-12 py-4 font-bold shadow-[0_0_30px_rgba(16,185,129,0.4)] bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Wallet className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm sm:text-base whitespace-nowrap">
                        Connect Wallet
                      </span>
                    </div>
                  </button>
                );
              }

              // STATE 2: Wrong Network
              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="w-full max-w-xs mb-12 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg transition-all"
                  >
                    Please Switch to Base Network
                  </button>
                );
              }

              // STATE 3: Connected (Standard View)
              return (
                <div className="flex gap-3 mb-12 w-full max-w-xs justify-center">
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-black px-4 py-3 rounded-xl font-medium transition-colors shadow-sm"
                  >
                    {chain.hasIcon && (
                      <div className="w-6 h-6 overflow-hidden rounded-full">
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? "Chain icon"}
                            src={chain.iconUrl}
                            className="w-6 h-6"
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="bg-white border border-gray-200 hover:bg-gray-50 text-black px-4 py-3 rounded-xl font-bold transition-colors shadow-sm"
                  >
                    {account.displayName}
                    {account.displayBalance
                      ? ` (${account.displayBalance})`
                      : ""}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default { HeaderConnectButton, HomeConnectButton };
