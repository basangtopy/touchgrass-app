/**
 * Minimal dot progress indicator for the full challenge flow:
 * Goal → Stake → Active → Verify → Result/Lost
 */

const steps = [
  { id: 1, key: "goal" },
  { id: 2, key: "stake" },
  { id: 3, key: "active" },
  { id: 4, key: "verify" },
  { id: 5, key: "result" },
];

export default function ProgressIndicator({
  currentStep = 1,
  variant = "default", // "default" | "success" | "failed"
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6 no-share">
      {steps.map((step, index) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        const isLast = index === steps.length - 1;

        // Determine dot color
        let dotColor = "bg-white/10"; // Upcoming
        if (isCompleted) {
          dotColor = "bg-emerald-500";
        } else if (isCurrent) {
          if (variant === "failed") {
            dotColor = "bg-rose-500";
          } else if (variant === "success") {
            dotColor = "bg-emerald-500";
          } else {
            dotColor = "bg-emerald-400";
          }
        }

        // Ring effect for current step
        const ringClass = isCurrent
          ? variant === "failed"
            ? "ring-2 ring-rose-500/30 ring-offset-1 ring-offset-[#0a0a0a]"
            : "ring-2 ring-emerald-500/30 ring-offset-1 ring-offset-[#0a0a0a]"
          : "";

        return (
          <div key={step.id} className="flex items-center">
            {/* Dot */}
            <div
              className={`
                w-2 h-2 rounded-full transition-all duration-300
                ${dotColor}
                ${ringClass}
                ${isCurrent ? "scale-125" : ""}
              `}
            />

            {/* Connector line */}
            {!isLast && (
              <div
                className={`
                  w-6 h-0.5 mx-1 rounded-full transition-all duration-300
                  ${isCompleted ? "bg-emerald-500/50" : "bg-white/5"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
