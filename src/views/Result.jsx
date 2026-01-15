import { useState, useEffect } from "react";
import {
  Trophy,
  CheckCircle,
  Share2,
  Coins,
  ExternalLink,
  Heart,
  HandHeart,
} from "lucide-react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Confetti from "../components/ui/Confetti";
import ProgressIndicator from "../components/ui/ProgressIndicator";
import { formatTimeRemaining } from "../utils/helpers";
import { handleShare } from "../utils/shareUtils";
import { handleMint } from "../hooks/useHandleNFTmint";
import Loading from "../components/ui/Loading";
import { useEthersSigner } from "../utils/ethersAdapter";
import { useParams, useNavigate } from "react-router-dom";

export default function Result({
  challenges,
  resultDonationPercent,
  setResultDonationPercent,
  markAsWithdrawn,
  setStep,
  showNotification,
  miniAppShare,
  isInMiniApp,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const activeChallenge = challenges.find((c) => c.id === id);

  const [donationTarget, setDonationTarget] = useState("charity"); // 'charity' or 'dev'
  const [isMinting, setIsMinting] = useState(false);

  const signer = useEthersSigner();

  // Handle redirects in useEffect to avoid side effects during render
  const isOngoing = activeChallenge
    ? Date.now() < activeChallenge.targetTime && !activeChallenge.completedAt
    : false;
  const isSuccessful = activeChallenge?.isSuccess;
  const isExpired = activeChallenge
    ? Date.now() > activeChallenge.targetTime && !isSuccessful
    : false;

  useEffect(() => {
    if (!activeChallenge) return;
    if (isOngoing) {
      navigate(`/active/${id}`);
    } else if (!isSuccessful && isExpired) {
      navigate(`/lost/${id}`);
    }
  }, [activeChallenge, isOngoing, isSuccessful, isExpired, id, navigate]);

  if (!activeChallenge) {
    return <Loading message="Fetching Challenge..." />;
  }

  const token = activeChallenge.token || "ETH";
  const donationAmount = (
    activeChallenge.stakeAmount *
    (resultDonationPercent / 100)
  ).toFixed(4);
  const remainingAmount = (
    activeChallenge.stakeAmount - donationAmount
  ).toFixed(4);
  const isWithdrawn = activeChallenge.isWithdrawn;
  const timeTaken =
    activeChallenge.completedAt && activeChallenge.createdAt
      ? formatTimeRemaining(
          activeChallenge.completedAt,
          activeChallenge.createdAt
        ).replace("00d ", "")
      : "N/A";

  const handleWithdrawClick = () => {
    // Pass the target to the parent handler
    markAsWithdrawn(activeChallenge.id, resultDonationPercent, donationTarget);
  };

  const shareResult = () => {
    handleShare(
      "sharecard",
      "My TouchGrass Challenge Result",
      `I just finished my "${activeChallenge.title}" challenge on TouchGrass. Check out my result!`,
      showNotification,
      "touchgrass_result.png",
      miniAppShare
    );
  };

  const mintNFT = () => {
    handleMint(signer, setIsMinting, showNotification, activeChallenge);
  };

  return (
    <div
      id="sharecard"
      className="h-full flex flex-col items-center py-6 pt-4 animate-scaleIn overflow-y-auto"
    >
      {/* Celebration confetti on load */}
      <Confetti trigger={true} duration={3000} />
      <ProgressIndicator currentStep={5} variant="success" />

      <div className="relative mb-6 flex-shrink-0">
        <div className="absolute -inset-6 bg-emerald-500/30 blur-2xl rounded-full animate-pulse"></div>
        <div className="bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full p-6 relative shadow-[0_0_40px_rgba(16,185,129,0.6)] border-4 border-emerald-300">
          <Trophy size={64} className="text-white drop-shadow-md" />
        </div>
      </div>
      <div className="text-center mb-6 flex-shrink-0">
        <h1 className="text-4xl font-black text-white mb-2 uppercase italic tracking-wider">
          YOU DID IT! 🎉
        </h1>
        <p className="text-emerald-200">
          Your commitment is now immortalized on the blockchain.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4 mb-6 flex-shrink-0 px-2">
        <Card className="bg-emerald-900/20 border-emerald-400/30">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
              <span className="text-emerald-200/60">Goal</span>
              <span className="text-white font-bold">
                {activeChallenge.title}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
              <span className="text-emerald-200/60">Completed In</span>
              <span className="text-emerald-300 font-mono">{timeTaken}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-emerald-200/60">Amount Staked</span>
              <span className="text-white font-bold">
                {activeChallenge.stakeAmount} {token}
              </span>
            </div>
          </div>
        </Card>

        {!isWithdrawn && (
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-emerald-200 text-sm font-semibold flex items-center gap-1">
                <Heart size={12} /> Pay it forward? 💚
              </span>
              <div className="flex items-center bg-black/30 rounded px-2 py-1 border border-white/10">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={resultDonationPercent}
                  onChange={(e) =>
                    setResultDonationPercent(Number(e.target.value))
                  }
                  className="w-12 bg-transparent text-right text-xs font-bold text-white focus:outline-none"
                />
                <span className="text-gray-500 text-xs ml-1">%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={resultDonationPercent}
              onChange={(e) => setResultDonationPercent(Number(e.target.value))}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />

            {resultDonationPercent > 0 && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setDonationTarget("charity")}
                  className={`flex-1 py-1 px-2 rounded text-xs border ${
                    donationTarget === "charity"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "border-white/10 text-gray-300"
                  }`}
                >
                  To Charity
                </button>
                <button
                  onClick={() => setDonationTarget("dev")}
                  className={`flex-1 py-1 px-2 rounded text-xs border ${
                    donationTarget === "dev"
                      ? "bg-purple-500/20 border-purple-500 text-purple-300"
                      : "border-white/10 text-gray-300"
                  }`}
                >
                  To Dev
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="w-full max-w-sm space-y-3 pb-4 flex-shrink-0 px-2">
        {!isWithdrawn ? (
          <Button
            onClick={handleWithdrawClick}
            variant="primary"
            className="w-full"
            hapticFeedback="heavy"
          >
            {resultDonationPercent > 0
              ? `Donate ${donationAmount} & Withdraw ${remainingAmount} ${token}`
              : `Withdraw Funds (${activeChallenge.stakeAmount} ${token})`}
          </Button>
        ) : (
          <div className="text-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-2">
            <span className="text-emerald-400 font-bold text-sm block mb-1">
              Funds Sent! 🎊
            </span>
            {activeChallenge.voluntaryDonationPercent > 0 && (
              <span className="text-emerald-400/60 text-xs block mb-1">
                You donated {activeChallenge.voluntaryDonationPercent}% to{" "}
                {activeChallenge.donationTarget === "dev"
                  ? "support the Dev"
                  : "Public Health"}
                !
              </span>
            )}
            {activeChallenge.withdrawalTxHash && (
              <a
                href={`${
                  import.meta.env.VITE_BLOCK_EXPLORER_URL ||
                  "https://basescan.org"
                }/tx/${activeChallenge.withdrawalTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-emerald-300 hover:text-white underline"
              >
                <ExternalLink size={10} className="mr-1" /> View Transaction
              </a>
            )}
          </div>
        )}
      </div>

      <div className="w-full flex-shrink-0 grid grid-cols-2 gap-3 no-share">
        <Button variant="secondary" onClick={shareResult} className="text-xs">
          <Share2 size={14} className="mr-1" />{" "}
          {isInMiniApp ? "Cast It! 📣" : "Brag About It 📣"}
        </Button>
        <Button
          variant="outline"
          disabled={isMinting}
          onClick={mintNFT}
          className="text-purple-300 border-purple-500/30 hover:bg-purple-500/10 text-xs disabled:opacity-50"
        >
          {isMinting ? (
            <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-1"></div>
          ) : (
            <Coins size={14} className="mr-1" />
          )}
          {isMinting ? "Minting..." : "Mint NFT 🏆"}
        </Button>
      </div>
      <Button
        variant="ghost"
        onClick={() => setStep("home")}
        className="w-full text-xs mt-4 no-share"
      >
        ← Back Home
      </Button>
    </div>
  );
}
