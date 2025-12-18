import { Leaf, Plus, ArrowRight, AlertOctagon, BookOpen } from "lucide-react";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { ChallengeListSkeleton } from "../components/ui/Skeleton";
import { formatTimeRemaining, getLockupDurationMs } from "../utils/helpers";
import Disclaimer from "../components/Disclaimer";
import HomeInfo from "../components/HomeInfo";
import FAQ from "../components/FAQ";
import PendingWithdrawals from "../components/PendingWithdrawals";

export default function Home({
  walletConnected,
  HomeConnectButton,
  basename,
  initNewChallenge,
  challenges,
  challengesLoading = false,
  openChallenge,
  currentTime,
  setStep,
  pendingWithdrawals,
  claimPendingWithdrawal,
  isProcessing,
}) {
  const ongoingList = challenges.filter(
    (c) => !c.isSuccess && !c.isWithdrawn && currentTime <= c.targetTime
  );

  const actionList = challenges.filter((c) => {
    if (c.isWithdrawn) return false;
    if (c.isSuccess) return true;
    if (currentTime > c.targetTime) return true;
    return false;
  });

  const pastList = challenges
    .filter((c) => c.isWithdrawn)
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  // Get the most recent successful challenge
  const lastSuccess = pastList.find((c) => c.isSuccess);

  // Find if any challenge is urgent (less than 1 hour remaining)
  const urgentChallenge = ongoingList.find(
    (c) => c.targetTime - currentTime < 3600000 && c.targetTime > currentTime
  );

  // Generate contextual, personalized message
  const getContextualMessage = () => {
    const hour = new Date().getHours();
    const greeting =
      hour < 12
        ? "Good morning"
        : hour < 18
        ? "Good afternoon"
        : "Good evening";

    // Priority 1: Urgent challenge warning
    if (urgentChallenge) {
      return `⚠️ ${basename}, you have a challenge ending soon! Time to verify?`;
    }

    // Priority 2: Recently completed success - celebrate!
    if (lastSuccess && Date.now() - (lastSuccess.completedAt || 0) < 86400000) {
      return `🎉 Great work on "${lastSuccess.title}"! Ready for another win?`;
    }

    // Priority 3: Ongoing challenges - keep them motivated
    if (ongoingList.length > 0) {
      const plural = ongoingList.length === 1 ? "challenge" : "challenges";
      return `${greeting}, ${basename}! You have ${ongoingList.length} ${plural} in motion. Keep pushing! 💪`;
    }

    // Priority 4: Has past challenges but none active
    if (pastList.length > 0) {
      return `${greeting}, ${basename}! Ready to start a new challenge? 🚀`;
    }

    // Default: New user or no challenges
    return `${greeting}, ${basename}! Ready to crush it? 💪`;
  };

  const DocsButton = () => (
    <button
      onClick={() => setStep("docs")}
      className="w-full mt-6 py-3 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-emerald-200/60 hover:text-emerald-200 hover:bg-white/5 transition-all text-sm font-medium group"
    >
      <BookOpen
        size={16}
        className="group-hover:scale-110 transition-transform"
      />
      How It Works →
    </button>
  );

  if (!walletConnected) {
    return (
      <div className="flex flex-col items-center h-full px-8 py-6 animate-fadeIn overflow-y-auto">
        <div className="text-center space-y-4 my-8">
          <div className="bg-gradient-to-br from-emerald-500/20 to-green-900/20 w-24 h-24 mx-auto rounded-3xl flex items-center justify-center ring-1 ring-white/10 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
            <Leaf size={48} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-5xl font-black text-white tracking-tight mb-2">
              TouchGrass
            </h1>
            <p className="text-emerald-200 text-lg">
              Bet on yourself. Prove it. Win it back.
            </p>
          </div>
        </div>

        <HomeConnectButton />

        <HomeInfo />

        <FAQ />

        <div className="w-full max-w-sm">
          <DocsButton />
        </div>

        <Disclaimer />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-full space-y-8 animate-fadeIn p-4 pt-12 w-full">
      <div className="text-center space-y-2 mt-2">
        <h1 className="text-2xl font-bold text-white">Your Command Center</h1>
        <p className="text-emerald-200/60 text-xs">{getContextualMessage()}</p>
      </div>

      <div className="w-full max-w-xs space-y-6">
        {/* Pending Withdrawals Alert */}
        <PendingWithdrawals
          pendingWithdrawals={pendingWithdrawals}
          onClaim={claimPendingWithdrawal}
          isProcessing={isProcessing}
        />

        <div className="space-y-4 w-full">
          {/* Only show New Commitment button when user has challenges */}
          {(actionList.length > 0 ||
            ongoingList.length > 0 ||
            pastList.length > 0) && (
            <Button
              onClick={initNewChallenge}
              variant="primary"
              className="w-full group"
            >
              <Plus
                size={20}
                className="group-hover:rotate-90 transition-transform"
              />{" "}
              New Commitment 💪
            </Button>
          )}

          {/* Skeleton loading state */}
          {challengesLoading && (
            <div className="py-4">
              <ChallengeListSkeleton count={2} />
            </div>
          )}

          {/* Empty State - Hero element when no challenges */}
          {!challengesLoading &&
            actionList.length === 0 &&
            ongoingList.length === 0 &&
            pastList.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] -mt-8">
                <EmptyState
                  title="No challenges yet!"
                  description="Put your money where your goals are. Ready to prove something?"
                  actionLabel="Start Your First Challenge 🚀"
                  onAction={initNewChallenge}
                  icon={Leaf}
                />
              </div>
            )}

          {actionList.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-rose-400 text-xs font-bold uppercase tracking-wider text-left ml-1 flex items-center gap-1">
                <AlertOctagon size={12} /> ⚠️ Needs Attention
              </h3>
              {actionList.map((c) => {
                let statusText = "Resolve Penalty";
                let statusColor = "text-rose-400";

                if (c.isSuccess) {
                  statusText = "Withdraw Funds";
                  statusColor = "text-emerald-400";
                } else if (c.penaltyType === "lock") {
                  const durationMs = c.targetTime - c.createdAt;
                  const unlockTime = c.targetTime + durationMs * 5;
                  const remaining = unlockTime - currentTime;
                  if (remaining > 0) {
                    statusText = `Locked (${formatTimeRemaining(
                      unlockTime,
                      currentTime
                    )})`;
                    statusColor = "text-yellow-400";
                  } else {
                    statusText = "Funds Unlocked - Withdraw";
                    statusColor = "text-emerald-400 animate-pulse";
                  }
                } else if (
                  c.penaltyType === "burn" ||
                  c.penaltyPercent === 100
                ) {
                  statusText = "Forfeit & Sweep";
                } else {
                  statusText = "Settle & Withdraw";
                }

                return (
                  <button
                    key={c.id}
                    onClick={() => openChallenge(c.id)}
                    className="w-full border p-4 rounded-2xl flex items-center justify-between transition-all group bg-black/20 border-white/10 hover:bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full animate-pulse ${
                          c.isSuccess ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      ></div>
                      <div className="text-left">
                        <div className="text-white font-bold text-sm">
                          {c.title}
                        </div>
                        <div className={`text-xs font-mono ${statusColor}`}>
                          {statusText}
                        </div>
                      </div>
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-white opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0"
                    />
                  </button>
                );
              })}
            </div>
          )}

          {ongoingList.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-emerald-200 text-xs font-bold uppercase tracking-wider text-left ml-1">
                In Progress 🔥
              </h3>
              {ongoingList.map((c) => {
                const isElapsed = currentTime > c.targetTime;
                const timeRemaining = c.targetTime - currentTime;
                const isUrgent = timeRemaining < 3600000 && timeRemaining > 0; // < 1 hour
                const isWarning =
                  timeRemaining < 10800000 && timeRemaining >= 3600000; // 1-3 hours

                return (
                  <button
                    key={c.id}
                    onClick={() => openChallenge(c.id)}
                    className={`w-full bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between hover:bg-emerald-900/30 transition-all group ${
                      isUrgent
                        ? "animate-urgent-pulse border-rose-500/50"
                        : isWarning
                        ? "animate-warning-pulse border-yellow-500/30"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      <div className="text-left">
                        <div className="text-white font-bold text-sm">
                          {c.title}
                        </div>
                        <div
                          className={`text-xs font-mono ${
                            isElapsed
                              ? "text-rose-400 font-bold"
                              : "text-emerald-400/60"
                          }`}
                        >
                          {isElapsed
                            ? "Time Elapsed"
                            : formatTimeRemaining(c.targetTime, currentTime)}
                        </div>
                      </div>
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0"
                    />
                  </button>
                );
              })}
            </div>
          )}

          {pastList.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-white/5">
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider text-left ml-1">
                Past Challenges
              </h3>
              {pastList.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openChallenge(c.id)}
                  className="w-full bg-black/20 border border-white/5 p-3 rounded-xl flex items-center justify-between opacity-70 hover:opacity-100 transition-all"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-gray-300 text-sm">{c.title}</span>
                    <span className="text-xs text-gray-600">
                      {c.durationValue} {c.durationUnit}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      c.isSuccess
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {c.isSuccess ? "WON" : "LOST"}
                  </span>
                </button>
              ))}
            </div>
          )}

          <DocsButton />

          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
