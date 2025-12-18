import { useEffect } from "react";
import {
  Ban,
  Lock,
  Share2,
  ExternalLink,
  Unlock,
  AlertTriangle,
  Clock,
  Flame,
  HeartHandshake,
} from "lucide-react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ProgressIndicator from "../components/ui/ProgressIndicator";
import { formatTimeRemaining } from "../utils/helpers";
import { handleShare } from "../utils/shareUtils";
import Loading from "../components/ui/Loading";
import { useParams, useNavigate } from "react-router-dom";

export default function Lost({
  challenges,
  currentTime,
  handleWithdraw,
  setStep,
  showNotification,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const activeChallenge = challenges.find((c) => c.id === id);

  // Handle redirects in useEffect to avoid side effects during render
  const isOngoing = activeChallenge
    ? currentTime < activeChallenge.targetTime && !activeChallenge.completedAt
    : false;
  const isSuccessful = activeChallenge?.isSuccess;

  useEffect(() => {
    if (!activeChallenge) return;
    if (isOngoing) {
      navigate(`/active/${id}`);
    } else if (isSuccessful) {
      navigate(`/result/${id}`);
    }
  }, [activeChallenge, isOngoing, isSuccessful, id, navigate]);

  if (!activeChallenge) {
    return <Loading message="Fetching Challenge..." />;
  }

  let lostAmount = (
    activeChallenge.stakeAmount *
    (activeChallenge.penaltyPercent / 100)
  ).toFixed(4);
  let remainingAmount = (activeChallenge.stakeAmount - lostAmount).toFixed(4);
  const token = activeChallenge.token || "ETH";

  // Calculate Unlock Time Locally
  let unlockTime = 0;
  if (activeChallenge.penaltyType === "lock") {
    const durationMs = activeChallenge.targetTime - activeChallenge.createdAt;
    unlockTime = activeChallenge.targetTime + durationMs * 5;
    lostAmount = "0.00";
    remainingAmount = activeChallenge.stakeAmount;
  }

  const isWithdrawn = activeChallenge.isWithdrawn;
  const timeToUnlock = unlockTime - currentTime;
  const isLocked =
    activeChallenge.penaltyType === "lock" && timeToUnlock > 0 && !isWithdrawn;

  // BUTTON LOGIC ------------------------

  // 1. Partial Settle: Not withdrawn, Not Lock, Not Burn/100%
  const showSettle =
    !isWithdrawn &&
    activeChallenge.penaltyType !== "lock" &&
    activeChallenge.penaltyType !== "burn" &&
    activeChallenge.penaltyPercent < 100;

  // 2. Lock Withdraw: Lock Penalty AND Time is Up AND Not Withdrawn
  const showWithdrawLock =
    !isWithdrawn && activeChallenge.penaltyType === "lock" && timeToUnlock <= 0;

  // 3. Forfeit/Sweep: 100% Penalty/Burn AND Not Withdrawn AND NOT LOCK
  // Strict check: activeChallenge.penaltyType !== 'lock'
  const showSweep =
    !isWithdrawn &&
    activeChallenge.penaltyType !== "lock" &&
    (activeChallenge.penaltyType === "burn" ||
      activeChallenge.penaltyPercent === 100);

  const getIcon = () => {
    if (activeChallenge.penaltyType === "lock")
      return <Lock size={48} className="text-yellow-500" />;
    if (activeChallenge.penaltyType === "burn")
      return <Flame size={48} className="text-orange-500" />;
    return <HeartHandshake size={48} className="text-rose-500" />;
  };

  const getStatusTitle = () => {
    if (isWithdrawn) return "All Settled";
    if (isLocked) return "Funds in Timeout ⏳";
    return "This One Got Away 😔";
  };

  const getSubtitle = () => {
    if (isWithdrawn && activeChallenge.penaltyType === "lock")
      return "Your funds are free and on their way back!";
    if (isWithdrawn) return "Penalty handled – time for a fresh start.";
    if (activeChallenge.penaltyType === "lock")
      return "Your funds need some time to cool off.";
    return "You didn't make it this time – but every setback is a setup for a comeback.";
  };

  const getSuccessText = () => {
    if (activeChallenge.penaltyType === "lock") return "Funds Released! 💰";
    if (activeChallenge.penaltyType === "burn")
      return "Tokens burned. Ouch, but it's done.";
    return "Penalty handled – onward!";
  };

  const shareResult = () => {
    handleShare(
      "sharecard",
      "My TouchGrass Challenge Result",
      `I just finished my "${activeChallenge.title}" challenge on TouchGrass. Check out my result!`,
      showNotification
    );
  };

  return (
    <div
      id="sharecard"
      className="h-full flex flex-col items-center py-6 pt-4 animate-scaleIn overflow-y-auto"
    >
      <ProgressIndicator currentStep={5} variant="failed" />
      <div className="bg-rose-500/20 p-6 rounded-full ring-1 ring-rose-500/50 mb-4 flex-shrink-0">
        {getIcon()}
      </div>

      <div className="text-center mb-6 flex-shrink-0">
        <h1 className="text-3xl font-black text-white mb-1">
          {getStatusTitle()}
        </h1>
        <p className="text-rose-200 text-sm max-w-xs mx-auto">
          {getSubtitle()}
        </p>
      </div>

      <Card className="bg-rose-900/10 border-rose-500/30 w-full max-w-sm text-left mb-6 flex-shrink-0">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Goal</span>
            <span className="text-white font-bold">
              {activeChallenge.title}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Duration</span>
            <span className="text-gray-300">
              {activeChallenge.durationValue} {activeChallenge.durationUnit}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Penalty</span>
            <span className="text-rose-400 uppercase text-xs">
              {activeChallenge.penaltyType} ({activeChallenge.penaltyPercent}
              %)
            </span>
          </div>

          {activeChallenge.penaltyType !== "lock" && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Forfeited</span>
                <span className="text-rose-500 font-bold">
                  -{lostAmount} {token}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/5 pt-2">
                <span className="text-emerald-400/70">Remaining</span>
                <span className="text-white font-bold">
                  {remainingAmount} {token}
                </span>
              </div>
            </>
          )}

          {isLocked && (
            <div className="bg-black/30 p-3 rounded-lg text-center mt-2 border border-yellow-500/30">
              <span className="text-xs text-gray-500 block mb-1 flex items-center justify-center gap-1">
                <Clock size={12} /> Unlocks In
              </span>
              <span className="font-mono text-2xl font-bold text-yellow-500">
                {formatTimeRemaining(unlockTime, currentTime)}
              </span>
            </div>
          )}
        </div>
      </Card>

      <div className="w-full max-w-sm space-y-3 pb-6 flex-shrink-0">
        {showSettle && (
          <Button
            onClick={() => handleWithdraw(activeChallenge.id)}
            variant="primary"
            className="w-full"
            hapticFeedback="heavy"
          >
            Settle Up & Get {remainingAmount} {token} Back
          </Button>
        )}

        {showWithdrawLock && (
          <Button
            onClick={() => handleWithdraw(activeChallenge.id)}
            variant="primary"
            className="w-full animate-pulse bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold"
            hapticFeedback="heavy"
          >
            <Unlock size={16} className="mr-1" /> Claim Unlocked Funds (
            {activeChallenge.stakeAmount} {token}) 💰
          </Button>
        )}

        {showSweep && (
          <Button
            onClick={() => handleWithdraw(activeChallenge.id)}
            variant="danger"
            className="w-full"
            hapticFeedback="heavy"
          >
            Accept the Loss & Close
          </Button>
        )}

        {isWithdrawn && (
          <div className="text-center p-3 bg-rose-900/10 border border-white/10 rounded-xl mb-2">
            <span className="text-gray-300 font-bold text-sm block mb-1">
              {getSuccessText()}
            </span>
            {activeChallenge.withdrawalTxHash && (
              <a
                href={`${
                  import.meta.env.VITE_BLOCK_EXPLORER_URL ||
                  "https://basescan.org"
                }/tx/${activeChallenge.withdrawalTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-gray-300 hover:text-white underline"
              >
                <ExternalLink size={10} className="mr-1" /> View Transaction
              </a>
            )}
          </div>
        )}
      </div>

      <div className="w-full flex-shrink-0 grid grid-cols-2 gap-3 no-share">
        <Button variant="secondary" onClick={shareResult} className="text-xs">
          <Share2 size={14} className="mr-1" /> Own It & Share
        </Button>
        <Button
          onClick={() => setStep("home")}
          variant="ghost"
          className="text-xs"
        >
          Dashboard
        </Button>
      </div>
    </div>
  );
}
