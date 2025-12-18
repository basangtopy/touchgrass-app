import { PENALTY_OPTIONS } from "../data/constants";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Tooltip from "../components/ui/Tooltip";
import ProgressIndicator from "../components/ui/ProgressIndicator";

export default function Staking({
  walletBalance,
  draftStakeAmount,
  setDraftStakeAmount,
  draftToken,
  setDraftToken,
  draftPenaltyType,
  setDraftPenaltyType,
  draftPenaltyPercent,
  setDraftPenaltyPercent,
  draftObjective,
  draftCustomTime,
  draftDurationUnit,
  confirmStartChallenge,
  currentFee,
  minStake,
  supportedTokens,
}) {
  const penaltyAmount = (
    draftStakeAmount *
    (draftPenaltyPercent / 100)
  ).toFixed(2);
  const lockMultiplier = 5;
  const timeVal = draftObjective ? draftObjective.defaultTime : draftCustomTime;
  const unit = draftObjective ? "hours" : draftDurationUnit;
  const lockString = `${timeVal * lockMultiplier} ${unit}`;

  // Check if balance is sufficient
  const isInsufficient =
    parseFloat(draftStakeAmount) > parseFloat(walletBalance);

  return (
    <div className="pt-4 pb-28">
      {/* Animated content wrapper */}
      <div className="space-y-6 animate-slideUp">
        <ProgressIndicator currentStep={2} />
        <h2 className="text-2xl font-bold text-white mb-1">
          How much are you betting on yourself?
        </h2>
        <Card>
          <div className="flex justify-between mb-4">
            <span className="text-emerald-200 text-sm font-bold uppercase tracking-wider">
              Your Commitment
            </span>
            <div className="flex bg-black/30 rounded-lg p-1">
              {supportedTokens.map((token) => (
                <button
                  key={token}
                  onClick={() => setDraftToken(token)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    draftToken === token
                      ? token === "ETH"
                        ? "bg-purple-600 text-white"
                        : "bg-blue-600 text-white"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {token}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
            <span className="text-2xl font-black text-white">
              {draftToken === "USDC" ? "$" : "Ξ"}
            </span>
            <input
              type="number"
              value={draftStakeAmount}
              onChange={(e) => setDraftStakeAmount(Number(e.target.value))}
              className={`bg-transparent text-4xl font-black w-full focus:outline-none ${
                isInsufficient ? "text-rose-500" : "text-white"
              }`}
              min={parseFloat(minStake) || 0}
            />
          </div>
          {/* BALANCE DISPLAY */}
          <div className="text-right">
            <span
              className={`text-xs font-mono ${
                isInsufficient
                  ? "text-rose-400 font-bold"
                  : "text-emerald-400/60"
              }`}
            >
              Available:{" "}
              {parseFloat(walletBalance).toFixed(draftToken === "ETH" ? 6 : 2)}{" "}
              {draftToken}
            </span>
          </div>
          <input
            type="range"
            min={parseFloat(minStake) || 0}
            max={walletBalance}
            step="0.1"
            value={draftStakeAmount}
            onChange={(e) => setDraftStakeAmount(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-4"
          />
        </Card>

        <div className="mt-2">
          <h3 className="text-sm font-semibold text-emerald-200 mb-4 uppercase tracking-wider">
            If you don't follow through...
          </h3>
          <div className="space-y-3">
            {PENALTY_OPTIONS.map((p) => (
              <button
                key={p.id}
                onClick={() => setDraftPenaltyType(p.id)}
                className={`w-full flex items-center p-3 rounded-xl border transition-all text-left ${
                  draftPenaltyType === p.id
                    ? "bg-rose-500/10 border-rose-500/50"
                    : "bg-black/20 border-white/5 hover:bg-white/5"
                }`}
              >
                <div
                  className={`p-2 rounded-full mr-3 ${
                    draftPenaltyType === p.id
                      ? "bg-rose-500 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  {p.icon}
                </div>
                <div className="flex-1">
                  <div
                    className={`font-bold text-sm ${
                      draftPenaltyType === p.id
                        ? "text-rose-200"
                        : "text-gray-300"
                    }`}
                  >
                    {p.title}
                  </div>
                  <div className="text-xs text-gray-500 leading-tight pr-2">
                    {p.id === "lock"
                      ? `Cannot withdraw for ${lockString} after objective ends`
                      : p.desc}
                  </div>
                </div>
                {draftPenaltyType === p.id && (
                  <div className="w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.8)] flex-shrink-0"></div>
                )}
              </button>
            ))}
          </div>
          {(draftPenaltyType === "charity" || draftPenaltyType === "dev") && (
            <div className="mt-4 p-4 bg-rose-900/20 rounded-xl border border-rose-500/20">
              <div className="flex justify-between text-xs text-rose-200 mb-2">
                <span>Penalty %</span>
                <span>{draftPenaltyPercent}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="10"
                value={draftPenaltyPercent}
                onChange={(e) => setDraftPenaltyPercent(e.target.value)}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <p className="text-[10px] text-rose-400 mt-2 text-center">
                You'll lose{" "}
                <span className="font-bold text-rose-300">
                  {draftToken === "USDC" ? "$" : "Ξ"}
                  {penaltyAmount}
                </span>{" "}
                if you miss your goal. The rest comes back to you.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed button - outside animated wrapper */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent z-30">
        <div className="max-w-md mx-auto">
          {/* Protocol fee disclosure - shown right before action */}
          <div className="flex items-center justify-center gap-1.5 mb-3 text-xs text-gray-300">
            <span>Includes {currentFee} protocol fee</span>
            <Tooltip text="Covers AI verification and server costs. Helps keep TouchGrass running!" />
          </div>
          <Button
            onClick={confirmStartChallenge}
            className="w-full"
            disabled={isInsufficient}
            hapticFeedback="heavy"
          >
            I'm In! Lock It 🔒 ({draftStakeAmount} {draftToken})
          </Button>
        </div>
      </div>
    </div>
  );
}
