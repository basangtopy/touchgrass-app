import { useState, useEffect } from "react";
import {
  Clock,
  Edit2,
  Check,
  X,
  Camera,
  Flame,
  Lock,
  Heart,
  Coins,
} from "lucide-react";
import Button from "../components/ui/Button";
import ProgressIndicator from "../components/ui/ProgressIndicator";
import { formatTimeRemaining } from "../utils/helpers";
import Loading from "../components/ui/Loading";
import { useParams, useNavigate } from "react-router-dom";

// Helper to get penalty icon and label
const getPenaltyInfo = (penaltyType) => {
  switch (penaltyType) {
    case "charity":
      return {
        icon: Heart,
        label: "Donated to Charity",
        color: "text-pink-400",
      };
    case "dev":
      return { icon: Coins, label: "Supports the Dev", color: "text-blue-400" };
    case "lock":
      return { icon: Lock, label: "Funds Locked", color: "text-yellow-400" };
    case "burn":
      return { icon: Flame, label: "Burned Forever", color: "text-red-400" };
    default:
      return { icon: Flame, label: "Penalty", color: "text-gray-400" };
  }
};

// Format end time to readable string - includes date if not today
const formatEndTime = (timestamp, currentTime) => {
  const endDate = new Date(timestamp);
  const today = new Date(currentTime);

  const isToday = endDate.toDateString() === today.toDateString();
  const isTomorrow =
    new Date(today.getTime() + 86400000).toDateString() ===
    endDate.toDateString();

  const timeStr = endDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) {
    return `Today ${timeStr}`;
  } else if (isTomorrow) {
    return `Tomorrow ${timeStr}`;
  } else {
    const dateStr = endDate.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    return `${dateStr} ${timeStr}`;
  }
};

export default function ActiveChallenge({
  challenges,
  currentTime,
  quote,
  setStep,
  updateChallengeStatus,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const activeChallenge = challenges.find((c) => c.id === id);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [showEndTime, setShowEndTime] = useState(false); // Toggle for timer tap

  useEffect(() => {
    if (activeChallenge) {
      setEditTitle(activeChallenge.title);
      if (activeChallenge.title.startsWith("Recovered Challenge")) {
        setIsEditing(true);
      }
    }
  }, [activeChallenge]);

  // Compute state flags with null safety for useEffect
  const isSuccessful = activeChallenge?.isSuccess;
  const isExpired = activeChallenge
    ? currentTime > activeChallenge.targetTime && !isSuccessful
    : false;

  // Handle redirect to lost page when expired (must be before conditional return)
  useEffect(() => {
    if (!activeChallenge) return;
    if (!isSuccessful && isExpired) {
      navigate(`/lost/${id}`);
    }
  }, [activeChallenge, isSuccessful, isExpired, id, navigate]);

  const handleSaveTitle = async () => {
    if (editTitle.trim().length > 0) {
      await updateChallengeStatus(activeChallenge.id, activeChallenge.status, {
        title: editTitle,
      });
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(activeChallenge.title);
    setIsEditing(false);
  };

  if (!activeChallenge) {
    return <Loading message="Fetching Challenge..." />;
  }

  const timeRemaining = activeChallenge.targetTime - currentTime;
  const totalDuration = activeChallenge.targetTime - activeChallenge.createdAt;
  const timeElapsed = currentTime - activeChallenge.createdAt;
  const progressPercent = Math.min(
    100,
    Math.max(0, (timeElapsed / totalDuration) * 100)
  );

  // Urgency levels
  const isUrgent = timeRemaining > 0 && timeRemaining < 3600000; // < 1 hour
  const isWarning = timeRemaining > 0 && timeRemaining < 7200000 && !isUrgent; // 1-2 hours

  // Get urgency color
  const getTimerColor = () => {
    if (isExpired) return "text-red-500";
    if (isSuccessful) return "text-emerald-500";
    if (isUrgent) return "text-red-400";
    if (isWarning) return "text-yellow-400";
    return "text-white";
  };

  // Get progress ring color based on percentage elapsed
  const getRingColor = () => {
    if (isExpired) return "text-red-500";
    if (isSuccessful) return "text-emerald-500";
    if (progressPercent >= 80) return "text-red-400"; // 80-100% = red
    if (progressPercent >= 60) return "text-yellow-400"; // 60-80% = yellow
    return "text-emerald-500"; // 0-60% = green
  };

  const getGlowColor = () => {
    if (isExpired) return "shadow-[0_0_30px_rgba(239,68,68,0.3)]";
    if (isSuccessful) return "shadow-[0_0_30px_rgba(16,185,129,0.3)]";
    if (isUrgent) return "shadow-[0_0_30px_rgba(239,68,68,0.3)]";
    if (isWarning) return "shadow-[0_0_30px_rgba(234,179,8,0.3)]";
    return "shadow-[0_0_30px_rgba(16,185,129,0.2)]";
  };

  const buttonRoute = isExpired
    ? `/lost/${id}`
    : isSuccessful
    ? `/result/${id}`
    : `/verify/${id}`;

  const penaltyInfo = getPenaltyInfo(activeChallenge.penaltyType);
  const PenaltyIcon = penaltyInfo.icon;

  return (
    <div className="h-full flex flex-col py-6 pt-4 animate-fadeIn relative justify-evenly">
      <ProgressIndicator currentStep={3} />

      {/* Header section */}
      <div className="text-center flex-shrink-0 z-10 mt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-orange-500/10 text-orange-300 text-xs font-bold border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)] mb-4">
          <span
            className={`w-2 h-2 rounded-full ${
              isExpired ? "bg-red-500" : "bg-orange-500 animate-pulse"
            }`}
          ></span>
          {isExpired
            ? "⏰ TIME'S UP"
            : isSuccessful
            ? "🎉 NAILED IT!"
            : "YOU'VE GOT THIS ⏱️"}
        </div>

        {/* Renaming UI for Recovered Challenges */}
        {isEditing ? (
          <div className="flex items-center justify-center gap-2 px-4">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="bg-black/30 border border-emerald-500/50 rounded px-2 py-1 text-white text-lg font-bold w-full max-w-xs focus:outline-none focus:border-emerald-400"
              placeholder="Enter original objective..."
            />
            <button
              onClick={handleSaveTitle}
              className="p-2 bg-emerald-600 rounded-full text-white hover:bg-emerald-500"
            >
              <Check size={16} />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 px-4 group">
            <h2 className="text-3xl font-bold text-white truncate tracking-tight">
              {activeChallenge.title}
            </h2>
            {activeChallenge.title.startsWith("Recovered Challenge") && (
              <button
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Timer section with progress ring */}
      <div className="flex-grow flex items-center justify-center z-10 py-4">
        <div
          className="relative w-64 h-64 sm:w-72 sm:h-72 cursor-pointer"
          onClick={() => setShowEndTime(!showEndTime)}
        >
          {/* Background ring */}
          <div className="absolute inset-0 rounded-full border-8 border-gray-800/50"></div>

          {/* Progress ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 100 100"
          >
            {/* Background track */}
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-gray-800/50"
            />
            {/* Progress arc */}
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className={`${getRingColor()} transition-all duration-500`}
              strokeDasharray={`${progressPercent * 2.89} 289`}
              strokeLinecap="round"
            />
          </svg>

          {/* Glow effect */}
          <div
            className={`absolute inset-4 rounded-full ${getGlowColor()} transition-all duration-500`}
          ></div>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Clock
              className={`w-6 h-6 mb-1 ${
                isExpired
                  ? "text-red-400"
                  : isUrgent
                  ? "text-red-400"
                  : "text-emerald-400"
              }`}
            />
            {showEndTime ? (
              <div className="text-center">
                <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 block">
                  {formatEndTime(activeChallenge.targetTime, currentTime)}
                </span>
              </div>
            ) : (
              <span
                className={`text-4xl sm:text-5xl font-mono font-black block tabular-nums tracking-tighter transition-all duration-300 ${getTimerColor()} ${
                  isUrgent ? "animate-timer-pulse" : ""
                }`}
              >
                {isSuccessful
                  ? formatTimeRemaining(
                      activeChallenge.completedAt,
                      currentTime
                    )
                  : formatTimeRemaining(
                      activeChallenge.targetTime,
                      currentTime
                    )}
              </span>
            )}
            <span className="text-xs text-emerald-400/60 uppercase tracking-widest mt-1 block">
              {isExpired
                ? "Awaiting Resolution"
                : isSuccessful
                ? "Completed"
                : showEndTime
                ? "Ends At"
                : "Time Left"}
            </span>

            {/* Progress percentage */}
            {!isSuccessful && !isExpired && (
              <span className="text-[10px] text-gray-500 mt-2">
                {Math.round(progressPercent)}% elapsed
              </span>
            )}
          </div>
        </div>
      </div>
      {/* Bottom section - stake, quote, and action */}
      <div className="flex-shrink-0 px-4 z-10 pb-6 space-y-5">
        {/* Stake info - compact horizontal badge */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="text-sm font-semibold text-white">
              {activeChallenge.stakeAmount} {activeChallenge.token}
            </span>
            <span className="text-xs text-gray-400">at stake</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <PenaltyIcon size={14} className={penaltyInfo.color} />
            <span className={`text-xs ${penaltyInfo.color}`}>
              {penaltyInfo.label}
            </span>
          </div>
        </div>

        {/* Quote - fixed height, 2 lines max */}
        <div className="h-8 flex items-center justify-center">
          <p className="text-center text-emerald-200/50 italic font-serif text-xs px-4 line-clamp-2 leading-relaxed">
            "{quote}"
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-1 overflow-visible">
          <Button
            onClick={() => navigate(buttonRoute)}
            variant={isExpired ? "danger" : "primary"}
            disabled={isEditing}
            hapticFeedback="medium"
            className={`w-full shadow-[0_0_20px_rgba(16,185,129,0.3)] py-4 text-base ${
              isEditing ? "opacity-50 cursor-not-allowed bg-gray-600" : ""
            } ${
              !isExpired && !isSuccessful && !isEditing
                ? "animate-pulse-subtle"
                : ""
            }`}
          >
            {isEditing ? (
              "Save Title First"
            ) : isExpired ? (
              "Time's Up – Handle It"
            ) : isSuccessful ? (
              "See Your Win 🏆"
            ) : (
              <>
                <Camera size={18} className="mr-1" />
                Done! Submit Proof
              </>
            )}
          </Button>
          <button
            onClick={() => setStep("home")}
            className="w-full text-center text-gray-500 text-xs py-2 hover:text-gray-300 transition-colors"
          >
            ← Back Home
          </button>
        </div>
      </div>
    </div>
  );
}
