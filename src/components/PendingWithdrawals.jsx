import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import Button from "./ui/Button";
import { formatUnits } from "ethers";

/**
 * PendingWithdrawals - Alert banner for unclaimed funds from failed ETH transfers
 *
 * This component appears when a user has pending withdrawals that they need to claim.
 * This happens when an ETH transfer fails (e.g., due to gas limits when sending to
 * smart wallets or contracts).
 */
export default function PendingWithdrawals({
  pendingWithdrawals,
  onClaim,
  isProcessing,
}) {
  // Filter to only show tokens with non-zero pending amounts
  const hasPending =
    pendingWithdrawals &&
    Object.keys(pendingWithdrawals).some(
      (symbol) => parseFloat(pendingWithdrawals[symbol]) > 0
    );

  if (!hasPending) return null;

  const pendingEntries = Object.entries(pendingWithdrawals).filter(
    ([_, amount]) => parseFloat(amount) > 0
  );

  return (
    <div className="w-full mb-4 animate-fadeIn">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="bg-amber-500/20 p-2 rounded-lg">
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-amber-300 font-bold text-sm">
              Unclaimed Funds Available
            </h3>
            <p className="text-amber-200/60 text-xs">
              A previous transfer failed – claim your funds here
            </p>
          </div>
        </div>

        {/* Pending items */}
        <div className="space-y-2">
          {pendingEntries.map(([symbol, amount]) => (
            <div
              key={symbol}
              className="flex items-center justify-between bg-black/20 rounded-xl p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-white font-mono font-bold">
                  {parseFloat(amount).toFixed(symbol === "ETH" ? 6 : 2)}{" "}
                  {symbol}
                </span>
              </div>
              <Button
                onClick={() => onClaim(symbol)}
                disabled={isProcessing}
                variant="primary"
                className="text-xs px-3 py-1.5"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1" />
                    Claiming...
                  </>
                ) : (
                  <>
                    Claim <ArrowRight size={14} className="ml-1" />
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Explanation */}
        <p className="text-amber-200/40 text-[10px] leading-relaxed">
          This can happen when withdrawing to smart wallets or contracts. Your
          funds are safe and can be claimed anytime.
        </p>
      </div>
    </div>
  );
}
