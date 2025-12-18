import { useState, useEffect, useRef } from "react";
import {
  Leaf,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
  Wallet,
  Camera,
  Trophy,
  AlertTriangle,
} from "lucide-react";

const ONBOARDING_KEY = "touchgrass_onboarding_complete";

const steps = [
  {
    id: 1,
    icon: Leaf,
    title: "Welcome to TouchGrass! ",
    description:
      "The accountability app that puts your money where your goals are. Stake crypto on personal goals, prove completion, and earn your funds back.",
    highlight: "No more broken promises.",
  },
  {
    id: 2,
    icon: Wallet,
    title: "How It Works",
    description:
      "1. Choose a goal (exercise, meditation, learning)\n2. Stake ETH or USDC on it\n3. Complete within the time limit\n4. Prove it with a photo",
    highlight: "Succeed and get your stake back.",
  },
  {
    id: 3,
    icon: AlertTriangle,
    title: "The Stakes Are Real",
    description:
      "Choose your penalty if you fail:\n• Donate to charity 💚\n• Support the dev 🛠️\n• Time lock your funds ⏰\n• Burn it forever 🔥",
    highlight: "Choose wisely. Your wallet is watching.",
  },
  {
    id: 4,
    icon: Camera,
    title: "AI-Powered Verification",
    description:
      "Our AI reviews your photo proof to verify completion. No cheating, no shortcuts – just genuine achievement.",
    highlight: "Be honest. The AI is watching. 👀",
  },
  {
    id: 5,
    icon: Trophy,
    title: "Ready to Prove Yourself?",
    description:
      "Join thousands who've used TouchGrass to build better habits and achieve their goals.",
    highlight: "Your first challenge awaits! 🚀",
  },
];

export default function OnboardingModal({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [direction, setDirection] = useState(0); // -1 = left, 0 = none, 1 = right
  const [isAnimating, setIsAnimating] = useState(false);

  // Touch/swipe handling
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const hasCompleted = localStorage.getItem(ONBOARDING_KEY);
    if (!hasCompleted) {
      setShouldShow(true);
      setTimeout(() => setIsVisible(true), 100);
    }
  }, []);

  const animateStep = (newStep, dir) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(dir);

    setTimeout(() => {
      setCurrentStep(newStep);
      setDirection(0);
      setIsAnimating(false);
    }, 200);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      animateStep(currentStep + 1, 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      animateStep(currentStep - 1, -1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsVisible(false);
    setTimeout(() => {
      setShouldShow(false);
      if (onComplete) onComplete();
    }, 300);
  };

  const handleSkip = () => {
    handleComplete();
  };

  // Swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX; // Reset end to start
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    // Only trigger if there was actual movement
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentStep < steps.length - 1) {
        // Swipe left = next
        handleNext();
      } else if (diff < 0 && currentStep > 0) {
        // Swipe right = back
        handleBack();
      }
    }
    // Reset touch positions
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  if (!shouldShow) return null;

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={handleSkip}
      />

      {/* Modal - Fixed size */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative bg-gray-900/95 border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl transition-all duration-300 overflow-hidden ${
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
        style={{ height: "420px" }} // Fixed height
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1 z-10"
        >
          <X size={18} />
        </button>

        {/* Content area with fixed height */}
        <div className="h-full flex flex-col p-6">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-4 flex-shrink-0">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() =>
                  !isAnimating && animateStep(i, i > currentStep ? 1 : -1)
                }
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "bg-emerald-500 w-6"
                    : i < currentStep
                    ? "bg-emerald-500/50 w-2"
                    : "bg-gray-600 w-2"
                }`}
              />
            ))}
          </div>

          {/* Animated content wrapper */}
          <div
            className={`flex-1 flex flex-col items-center justify-center transition-all duration-200 ${
              direction === 1
                ? "-translate-x-8 opacity-0"
                : direction === -1
                ? "translate-x-8 opacity-0"
                : "translate-x-0 opacity-100"
            }`}
          >
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-600/20 flex items-center justify-center border border-emerald-500/30 mt-4 ">
              <Icon size={28} className="text-emerald-400" />
            </div>

            {/* Content */}
            <div className="text-center flex-1 flex flex-col justify-center">
              <h2 className="text-lg font-bold text-white mb-2 justify-center flex gap-2">
                {" "}
                {step.title}{" "}
                {currentStep === 0 && (
                  <span className="text-emerald-400">
                    <Leaf size={24} />
                  </span>
                )}
              </h2>
              <p className="text-gray-300 text-sm whitespace-pre-line leading-relaxed mb-3 max-h-32 overflow-hidden">
                {step.description}
              </p>
              <p className="text-emerald-400 text-sm font-semibold">
                {step.highlight}
              </p>
            </div>
          </div>

          {/* Navigation - minimal arrows */}
          <div className="flex items-center justify-between mt-4 flex-shrink-0">
            {/* Back button */}
            <button
              onClick={handleBack}
              disabled={isFirstStep}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isFirstStep
                  ? "opacity-0 cursor-default"
                  : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <ArrowLeft size={18} />
            </button>

            {/* Skip text */}
            {!isLastStep && (
              <button
                onClick={handleSkip}
                className="text-gray-500 text-xs hover:text-gray-300 transition-colors"
              >
                Skip
              </button>
            )}

            {/* Next/Complete button */}
            <button
              onClick={handleNext}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isLastStep
                  ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                  : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
              }`}
            >
              {isLastStep ? <Check size={18} /> : <ArrowRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export function to reset onboarding (for testing)
export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
}
