import haptic from "../../utils/haptic";

export default function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
  hapticFeedback = "light", // "none" | "light" | "medium" | "heavy"
}) {
  const baseStyle =
    "px-6 py-3 rounded-xl font-bold transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-400 hover:to-green-500 shadow-emerald-500/30",
    secondary:
      "bg-white/10 backdrop-blur-md text-emerald-100 hover:bg-white/20 border border-white/10",
    danger:
      "bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-400 hover:to-rose-500 shadow-red-500/30",
    outline:
      "border-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10",
    ghost: "bg-transparent hover:bg-white/5 text-emerald-200",
  };

  const handleClick = (e) => {
    // Trigger haptic feedback on mobile
    if (hapticFeedback !== "none" && !disabled) {
      if (hapticFeedback === "light") haptic.light();
      else if (hapticFeedback === "medium") haptic.medium();
      else if (hapticFeedback === "heavy") haptic.heavy();
    }

    // Call original onClick
    if (onClick) onClick(e);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
